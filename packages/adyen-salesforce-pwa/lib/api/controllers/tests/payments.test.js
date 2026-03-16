import sendPayments from '../payments'
import {RESULT_CODES} from '../../../utils/constants.mjs'
import {AdyenError} from '../../models/AdyenError'
import * as orderHelper from '../../helpers/orderHelper.js'
import * as paymentsHelper from '../../helpers/paymentsHelper.js'
import AdyenClientProvider from '../../models/adyenClientProvider'

let mockPayments = jest.fn()

jest.mock('../../models/logger')

jest.mock('../../models/adyenClientProvider')

jest.mock('../../helpers/paymentsHelper.js', () => {
    const FAILURE = new Set(['Error', 'Refused', 'Cancelled'])
    const SUCCESSFUL = new Set([
        'Authorised',
        'Received',
        'ChallengeShopper',
        'RedirectShopper',
        'IdentifyShopper',
        'PresentToShopper'
    ])
    return {
        createCheckoutResponse: jest.fn((response, orderNo) => {
            const merchantReference = response.merchantReference || orderNo
            if (FAILURE.has(response.resultCode)) {
                return {isFinal: true, isSuccessful: false, merchantReference}
            }
            if (response.action) {
                return {
                    isFinal: false,
                    isSuccessful: true,
                    action: response.action,
                    merchantReference
                }
            }
            if (response.order) {
                const isFinal = response.order.remainingAmount?.value <= 0
                return {
                    isFinal,
                    isSuccessful: SUCCESSFUL.has(response.resultCode),
                    merchantReference
                }
            }
            return {
                isFinal: true,
                isSuccessful: SUCCESSFUL.has(response.resultCode),
                merchantReference
            }
        }),
        createPaymentRequestObject: jest.fn().mockResolvedValue({
            amount: {value: 1000, currency: 'USD'},
            paymentMethod: {type: 'scheme'},
            reference: '123'
        }),
        revertCheckoutState: jest.fn(),
        validateBasketPayments: jest.fn(),
        isApplePayExpress: jest.fn(
            (data) =>
                data?.paymentMethod?.type === 'applepay' &&
                data?.paymentMethod?.subtype === 'express'
        ),
        isPayPalExpress: jest.fn(
            (data) =>
                data?.paymentMethod?.type === 'paypal' && data?.paymentMethod?.subtype === 'express'
        )
    }
})

jest.mock('../../helpers/orderHelper.js', () => ({
    createOrderUsingOrderNo: jest.fn(),
    failOrderAndReopenBasket: jest.fn(),
    updatePaymentInstrumentForOrder: jest.fn()
}))

describe('payments controller', () => {
    let req, res, next
    const mockBasket = {
        basketId: 'testBasket',
        c_orderNo: '123',
        customerInfo: {customerId: 'testCustomer'},
        billingAddress: {firstName: 'John', lastName: 'Doe'},
        shipments: [{shippingAddress: {}}],
        currency: 'USD',
        orderTotal: 1000,
        productItems: []
    }

    beforeEach(() => {
        req = {
            body: {data: {paymentMethod: {type: 'scheme'}}},
            query: {siteId: 'RefArch'},
            ip: '127.0.0.1'
        }
        res = {
            locals: {
                adyen: {
                    basket: mockBasket,
                    adyenConfig: {},
                    siteId: 'RefArch',
                    basketService: {
                        addShopperData: jest.fn(),
                        addPaymentInstrument: jest.fn(),
                        update: jest.fn()
                    }
                }
            }
        }
        next = jest.fn()

        // Reset mocks
        jest.clearAllMocks()

        // Mock AdyenClientProvider
        AdyenClientProvider.mockImplementation(() => ({
            getPaymentsApi: () => ({
                payments: mockPayments
            })
        }))

        orderHelper.createOrderUsingOrderNo.mockResolvedValue({orderNo: '123'})
    })

    it('standard payment (scheme): pre-creates order and skips basket update on AUTHORISED', async () => {
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'ref123',
            pspReference: 'psp123'
        })

        await sendPayments(req, res, next)

        // addPaymentInstrument called before Adyen (pre-create step)
        expect(res.locals.adyen.basketService.addPaymentInstrument).toHaveBeenCalled()
        expect(mockPayments).toHaveBeenCalled()
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        // basket was consumed by order creation — must NOT attempt basket update
        expect(res.locals.adyen.basketService.update).not.toHaveBeenCalled()
        // PSP reference patched onto the pre-created order
        expect(orderHelper.updatePaymentInstrumentForOrder).toHaveBeenCalledWith(
            res.locals.adyen,
            '123',
            'psp123'
        )
        expect(res.locals.response).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'ref123',
            order: undefined,
            resultCode: RESULT_CODES.AUTHORISED
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('standard payment (scheme): pre-creates order and skips basket update on 3DS action', async () => {
        const mockAction = {type: 'threeDS2'}
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.CHALLENGE_SHOPPER,
            action: mockAction
        })

        await sendPayments(req, res, next)

        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        // basket was consumed — must NOT attempt basket update
        expect(res.locals.adyen.basketService.update).not.toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            isFinal: false,
            isSuccessful: true,
            merchantReference: '123',
            action: mockAction,
            order: undefined,
            resultCode: RESULT_CODES.CHALLENGE_SHOPPER
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('standard payment (scheme): fails order and reopens basket on refused payment', async () => {
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.ERROR,
            merchantReference: 'ref123'
        })
        orderHelper.failOrderAndReopenBasket.mockResolvedValue('newBasket456')

        await sendPayments(req, res, next)

        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalled()
        expect(paymentsHelper.revertCheckoutState).not.toHaveBeenCalled()
        const err = next.mock.calls[0][0]
        expect(err).toBeInstanceOf(AdyenError)
        expect(err.newBasketId).toBe('newBasket456')
    })

    it('express payment: updates basket and creates order on AUTHORISED', async () => {
        req.body.data = {paymentMethod: {type: 'applepay', subtype: 'express'}}
        res.locals.adyen.basketService.addShopperData = jest.fn()
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'ref123',
            pspReference: 'psp456'
        })

        await sendPayments(req, res, next)

        // no order pre-creation for express
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalledTimes(1)
        // basket still alive — update should be called
        expect(res.locals.adyen.basketService.update).toHaveBeenCalled()
        expect(res.locals.response.isSuccessful).toBe(true)
        expect(next).toHaveBeenCalledWith()
    })

    it('express payment: updates basket with action on redirect', async () => {
        req.body.data = {paymentMethod: {type: 'paypal', subtype: 'express'}}
        res.locals.adyen.basketService.addShopperData = jest.fn()
        const mockAction = {type: 'redirect'}
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.REDIRECT_SHOPPER,
            action: mockAction
        })

        await sendPayments(req, res, next)

        // no pre-created order — basket update should be called
        expect(res.locals.adyen.basketService.update).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            isFinal: false,
            isSuccessful: true,
            merchantReference: '123',
            action: mockAction,
            order: undefined,
            resultCode: RESULT_CODES.REDIRECT_SHOPPER
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('throws when adyenContext is not set', async () => {
        res.locals.adyen = undefined
        await sendPayments(req, res, next)
        expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
    })

    it('calls addShopperData for Apple Pay Express', async () => {
        req.body.data = {paymentMethod: {type: 'applepay', subtype: 'express'}}
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'ref123'
        })

        await sendPayments(req, res, next)

        expect(res.locals.adyen.basketService.addShopperData).toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith()
    })

    it('handles successful payment without pspReference', async () => {
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'ref123'
        })

        await sendPayments(req, res, next)

        expect(res.locals.response.isSuccessful).toBe(true)
        expect(next).toHaveBeenCalledWith()
    })

    it('saves partial gift card payment order data to basket', async () => {
        req.body.data = {paymentMethod: {type: 'giftcard'}}
        const mockOrderData = {orderData: '...'}
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.PRESENT_TO_SHOPPER,
            order: mockOrderData
        })

        await sendPayments(req, res, next)

        expect(res.locals.adyen.basketService.update).toHaveBeenCalledWith({
            c_orderData: JSON.stringify(mockOrderData)
        })
        expect(res.locals.response.isFinal).toBe(false)
        expect(res.locals.response.isSuccessful).toBe(true)
        expect(next).toHaveBeenCalledWith()
    })
})
