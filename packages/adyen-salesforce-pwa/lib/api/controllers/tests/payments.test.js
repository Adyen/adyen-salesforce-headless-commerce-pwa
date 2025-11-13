import sendPayments from '../payments'
import {RESULT_CODES} from '../../../utils/constants.mjs'
import {AdyenError} from '../../models/AdyenError'
import * as orderHelper from '../../helpers/orderHelper.js'
import * as paymentsHelper from '../../helpers/paymentsHelper.js'
import AdyenClientProvider from '../../models/adyenClientProvider'

let mockPayments = jest.fn()

jest.mock('../../models/logger')

jest.mock('../../models/adyenClientProvider')

jest.mock('../../helpers/paymentsHelper.js', () => ({
    ...jest.requireActual('../../helpers/paymentsHelper.js'),
    revertCheckoutState: jest.fn()
}))

jest.mock('../../helpers/orderHelper.js', () => ({
    createOrderUsingOrderNo: jest.fn(),
    failOrderAndReopenBasket: jest.fn()
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

    it('returns checkout response if request is valid and payment is AUTHORISED', async () => {
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'ref123'
        })

        await sendPayments(req, res, next)

        expect(res.locals.adyen.basketService.addPaymentInstrument).toHaveBeenCalled()
        expect(mockPayments).toHaveBeenCalled()
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'ref123',
            order: undefined,
            resultCode: RESULT_CODES.AUTHORISED
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('handles payment failure and attempts to revert the checkout state', async () => {
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.ERROR,
            merchantReference: 'ref123'
        })

        await sendPayments(req, res, next)

        expect(paymentsHelper.revertCheckoutState).toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(
            new AdyenError('payment was not successful', 400, {
                resultCode: 'Error',
                merchantReference: 'ref123'
            })
        )
    })

    it('handles non-final payments with an action', async () => {
        const mockAction = {type: 'redirect'}
        mockPayments.mockResolvedValue({
            resultCode: RESULT_CODES.REDIRECT_SHOPPER,
            action: mockAction
        })

        await sendPayments(req, res, next)

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

    it('saves partial payment order data to basket', async () => {
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
