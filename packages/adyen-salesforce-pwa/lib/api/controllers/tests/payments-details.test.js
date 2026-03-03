import sendPaymentDetails from '../payments-details'
import {RESULT_CODES} from '../../../utils/constants.mjs'
import {AdyenError} from '../../models/AdyenError'
import * as orderHelper from '../../helpers/orderHelper.js'
import * as paymentsHelper from '../../helpers/paymentsHelper.js'
import AdyenClientProvider from '../../models/adyenClientProvider'

let mockPaymentsDetails = jest.fn()

jest.mock('../../models/logger')
jest.mock('../../models/adyenClientProvider')

jest.mock('../../helpers/paymentsHelper.js', () => ({
    ...jest.requireActual('../../helpers/paymentsHelper.js'),
    revertCheckoutState: jest.fn(),
    validateBasketPayments: jest.fn()
}))

jest.mock('../../helpers/orderHelper.js', () => ({
    createOrderUsingOrderNo: jest.fn(),
    failOrderAndReopenBasket: jest.fn(),
    updatePaymentInstrumentForOrder: jest.fn()
}))

describe('payments details controller', () => {
    let req, res, next
    const mockBasket = {
        basketId: 'testBasket',
        c_orderNo: '123',
        c_amount: JSON.stringify({value: 2500, currency: 'EUR'}),
        c_paymentMethod: JSON.stringify({type: 'scheme'})
    }

    beforeEach(() => {
        req = {
            body: {data: {details: {redirectResult: '...'}}},
            query: {siteId: 'RefArch'}
        }
        res = {
            locals: {
                adyen: {
                    basket: mockBasket,
                    siteId: 'RefArch',
                    basketService: {
                        update: jest.fn(),
                        addPaymentInstrument: jest.fn()
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
                paymentsDetails: mockPaymentsDetails
            })
        }))

        orderHelper.createOrderUsingOrderNo.mockResolvedValue({orderNo: '123'})
    })

    it('returns checkout response if payments details response is AUTHORISED', async () => {
        mockPaymentsDetails.mockResolvedValue({
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'ref123',
            pspReference: 'psp-express-123'
        })

        await sendPaymentDetails(req, res, next)

        expect(paymentsHelper.validateBasketPayments).toHaveBeenCalled()
        expect(mockPaymentsDetails).toHaveBeenCalled()
        // Express flow: addPaymentInstrument on basket before order creation
        expect(res.locals.adyen.basketService.addPaymentInstrument).toHaveBeenCalledWith(
            {value: 2500, currency: 'EUR'},
            {type: 'scheme'}
        )
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        // pspReference patched onto the order after Adyen response
        expect(orderHelper.updatePaymentInstrumentForOrder).toHaveBeenCalledWith(
            res.locals.adyen,
            '123',
            'psp-express-123'
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

    it('handles payment details failure and attempts to fail order and reopen basket', async () => {
        mockPaymentsDetails.mockResolvedValue({
            resultCode: RESULT_CODES.ERROR,
            merchantReference: 'ref123'
        })
        orderHelper.failOrderAndReopenBasket.mockResolvedValue('newBasket456')

        await sendPaymentDetails(req, res, next)

        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalled()
        expect(paymentsHelper.revertCheckoutState).not.toHaveBeenCalled()
        const err = next.mock.calls[0][0]
        expect(err).toBeInstanceOf(AdyenError)
        expect(err.newBasketId).toBe('newBasket456')
    })

    it('handles non-final payment details with an action', async () => {
        const mockAction = {type: 'redirect'}
        mockPaymentsDetails.mockResolvedValue({
            resultCode: RESULT_CODES.REDIRECT_SHOPPER,
            action: mockAction
        })

        await sendPaymentDetails(req, res, next)

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
        await sendPaymentDetails(req, res, next)
        expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
    })

    it('handles basket without c_amount and c_paymentMethod', async () => {
        res.locals.adyen.basket = {basketId: 'testBasket', c_orderNo: '123'}
        mockPaymentsDetails.mockResolvedValue({
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'ref123'
        })

        await sendPaymentDetails(req, res, next)

        expect(paymentsHelper.validateBasketPayments).toHaveBeenCalledWith(
            expect.anything(),
            '',
            ''
        )
        expect(next).toHaveBeenCalledWith()
    })

    it('saves partial payment order data to basket', async () => {
        const mockOrderData = {orderData: '...'}
        mockPaymentsDetails.mockResolvedValue({
            resultCode: RESULT_CODES.PRESENT_TO_SHOPPER,
            order: mockOrderData
        })

        await sendPaymentDetails(req, res, next)

        expect(res.locals.adyen.basketService.update).toHaveBeenCalledWith({
            c_orderData: JSON.stringify(mockOrderData)
        })
        expect(res.locals.response.isFinal).toBe(false)
        expect(res.locals.response.isSuccessful).toBe(true)
        expect(next).toHaveBeenCalledWith()
    })

    describe('no-basket (standard 3DS) flow', () => {
        beforeEach(() => {
            // Simulate basket consumed by order pre-creation in payments step
            res.locals.adyen.basket = {}
        })

        it('redirect return with new empty basket (no c_orderNo): resolves orderNo from merchantReference', async () => {
            // Simulate SFCC auto-creating a new empty basket after redirect
            res.locals.adyen.basket = {basketId: 'newEmptyBasket'}
            mockPaymentsDetails.mockResolvedValue({
                resultCode: RESULT_CODES.AUTHORISED,
                merchantReference: 'order-789',
                pspReference: 'psp-xyz'
            })

            await sendPaymentDetails(req, res, next)

            // Must not attempt order creation on the empty basket
            expect(orderHelper.createOrderUsingOrderNo).not.toHaveBeenCalled()
            expect(paymentsHelper.validateBasketPayments).not.toHaveBeenCalled()
            expect(orderHelper.updatePaymentInstrumentForOrder).toHaveBeenCalledWith(
                res.locals.adyen,
                'order-789',
                'psp-xyz'
            )
            expect(res.locals.response.merchantReference).toBe('order-789')
            expect(next).toHaveBeenCalledWith()
        })

        it('resolves orderNo from response.merchantReference and updates payment instrument', async () => {
            mockPaymentsDetails.mockResolvedValue({
                resultCode: RESULT_CODES.AUTHORISED,
                merchantReference: 'order-123',
                pspReference: 'psp-abc'
            })

            await sendPaymentDetails(req, res, next)

            // No basket — must not attempt order creation
            expect(orderHelper.createOrderUsingOrderNo).not.toHaveBeenCalled()
            // PSP reference patched onto the pre-created order via merchantReference
            expect(orderHelper.updatePaymentInstrumentForOrder).toHaveBeenCalledWith(
                res.locals.adyen,
                'order-123',
                'psp-abc'
            )
            expect(res.locals.response).toEqual({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'order-123',
                order: undefined,
                resultCode: RESULT_CODES.AUTHORISED
            })
            expect(next).toHaveBeenCalledWith()
        })

        it('calls failOrderAndReopenBasket with merchantReference orderNo on failure', async () => {
            // First call returns a failed response (triggers throw), preCreatedOrderNo set from merchantReference
            mockPaymentsDetails.mockResolvedValue({
                resultCode: RESULT_CODES.ERROR,
                merchantReference: 'order-456'
            })
            orderHelper.failOrderAndReopenBasket.mockResolvedValue('newBasket789')

            await sendPaymentDetails(req, res, next)

            expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalled()
            const err = next.mock.calls[0][0]
            expect(err.newBasketId).toBe('newBasket789')
        })
    })
})
