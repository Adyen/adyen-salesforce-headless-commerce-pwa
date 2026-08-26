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
    getOpenOrderForShopper: jest.fn(),
    updateOrderPaymentInstrument: jest.fn()
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
        expect(orderHelper.updateOrderPaymentInstrument).toHaveBeenCalledWith(
            '123',
            'RefArch',
            'psp-express-123',
            {pspReference: 'psp-express-123', donationToken: undefined}
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

        // Standard flow keeps the shipping address on the reopened basket
        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, '123', {
            reopenBasket: true,
            removeShippingAddress: false
        })
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

    describe('express flow with a client-supplied orderNo', () => {
        beforeEach(() => {
            req.body.orderNo = 'express-order-1'
        })

        it('skips order creation and patches the payment instrument on the supplied order', async () => {
            mockPaymentsDetails.mockResolvedValue({
                resultCode: RESULT_CODES.AUTHORISED,
                pspReference: 'psp-gp-3ds'
            })

            await sendPaymentDetails(req, res, next)

            expect(paymentsHelper.validateBasketPayments).not.toHaveBeenCalled()
            expect(res.locals.adyen.basketService.addPaymentInstrument).not.toHaveBeenCalled()
            expect(orderHelper.createOrderUsingOrderNo).not.toHaveBeenCalled()
            expect(orderHelper.updateOrderPaymentInstrument).toHaveBeenCalledWith(
                'express-order-1',
                'RefArch',
                'psp-gp-3ds',
                {pspReference: 'psp-gp-3ds', donationToken: undefined}
            )
            expect(res.locals.response.merchantReference).toBe('express-order-1')
            expect(next).toHaveBeenCalledWith()
        })

        it('fails the supplied order and clears the shipping address when 3DS is refused', async () => {
            mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.REFUSED})
            orderHelper.failOrderAndReopenBasket.mockResolvedValue('newBasketExpress')

            await sendPaymentDetails(req, res, next)

            expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalledWith(
                res.locals.adyen,
                'express-order-1',
                {reopenBasket: true, removeShippingAddress: true}
            )
            expect(paymentsHelper.revertCheckoutState).not.toHaveBeenCalled()
            expect(next.mock.calls[0][0].newBasketId).toBe('newBasketExpress')
        })

        it('does not reopen the basket when the order came from a temporary basket', async () => {
            req.body.isTemporaryBasket = true
            mockPaymentsDetails.mockRejectedValue(new Error('Network timeout'))
            orderHelper.failOrderAndReopenBasket.mockResolvedValue(null)

            await sendPaymentDetails(req, res, next)

            expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalledWith(
                res.locals.adyen,
                'express-order-1',
                {reopenBasket: false, removeShippingAddress: true}
            )
            expect(next.mock.calls[0][0].newBasketId).toBeUndefined()
        })
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
            expect(orderHelper.updateOrderPaymentInstrument).toHaveBeenCalledWith(
                'order-789',
                'RefArch',
                'psp-xyz',
                {pspReference: 'psp-xyz', donationToken: undefined}
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
            expect(orderHelper.updateOrderPaymentInstrument).toHaveBeenCalledWith(
                'order-123',
                'RefArch',
                'psp-abc',
                {pspReference: 'psp-abc', donationToken: undefined}
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

        it('falls back to getOpenOrderForShopper when paymentsDetails throws without merchantReference', async () => {
            res.locals.adyen.basket = {}
            res.locals.adyen.authorization = 'Bearer token'
            res.locals.adyen.customerId = 'cust-123'
            res.locals.adyen.siteId = 'RefArch'
            mockPaymentsDetails.mockRejectedValue(new Error('Network timeout'))
            orderHelper.getOpenOrderForShopper.mockResolvedValue({orderNo: 'orphan-order-1'})
            orderHelper.failOrderAndReopenBasket.mockResolvedValue('recovered-basket-id')

            await sendPaymentDetails(req, res, next)

            expect(orderHelper.getOpenOrderForShopper).toHaveBeenCalledWith(
                'Bearer token',
                'cust-123',
                'RefArch'
            )
            expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalled()
            const err = next.mock.calls[0][0]
            expect(err.newBasketId).toBe('recovered-basket-id')
        })

        it('returns no newBasketId when no open order found and no basket exists', async () => {
            res.locals.adyen.basket = {}
            res.locals.adyen.authorization = 'Bearer token'
            res.locals.adyen.customerId = 'cust-123'
            res.locals.adyen.siteId = 'RefArch'
            mockPaymentsDetails.mockRejectedValue(new Error('Network timeout'))
            orderHelper.getOpenOrderForShopper.mockResolvedValue(null)

            await sendPaymentDetails(req, res, next)

            expect(orderHelper.getOpenOrderForShopper).toHaveBeenCalled()
            expect(orderHelper.failOrderAndReopenBasket).not.toHaveBeenCalled()
            const err = next.mock.calls[0][0]
            expect(err.newBasketId).toBeUndefined()
        })
    })
})
