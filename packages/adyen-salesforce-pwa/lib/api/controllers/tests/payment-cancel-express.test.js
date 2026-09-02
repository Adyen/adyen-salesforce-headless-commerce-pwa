import paymentCancelExpress from '../payment-cancel-express'
import Logger from '../../models/logger'
import {revertCheckoutStateForExpress} from '../../helpers/paymentsHelper.js'
import {failOrderAndReopenBasket} from '../../helpers/orderHelper.js'
import {AdyenError} from '../../models/AdyenError'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

jest.mock('../../models/logger')
jest.mock('../../helpers/paymentsHelper.js', () => ({
    revertCheckoutStateForExpress: jest.fn()
}))
jest.mock('../../helpers/orderHelper.js', () => ({
    failOrderAndReopenBasket: jest.fn()
}))

describe('paymentCancelExpress Controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()

        req = {body: {}}
        res = {
            locals: {
                adyen: {}
            }
        }
        next = jest.fn()
    })

    it('should successfully call revertCheckoutStateForExpress and pass to next middleware', async () => {
        revertCheckoutStateForExpress.mockResolvedValue(undefined)

        await paymentCancelExpress(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('paymentCancelExpress', 'start')
        expect(failOrderAndReopenBasket).not.toHaveBeenCalled()
        expect(revertCheckoutStateForExpress).toHaveBeenCalledWith(
            res.locals.adyen,
            'paymentCancelExpress'
        )
        expect(res.locals.response).toEqual({})
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('should call next with an error if revertCheckoutStateForExpress throws', async () => {
        const mockError = new Error('Something went wrong')
        mockError.stack = 'Error: Something went wrong\n    at ...'
        revertCheckoutStateForExpress.mockRejectedValue(mockError)

        await paymentCancelExpress(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('paymentCancelExpress', 'start')
        expect(revertCheckoutStateForExpress).toHaveBeenCalledWith(
            res.locals.adyen,
            'paymentCancelExpress'
        )
        expect(Logger.error).toHaveBeenCalledWith('paymentCancelExpress', mockError.stack)
        expect(next).toHaveBeenCalledWith(mockError)
    })

    it('should fail the order from the request body and return the new basket id', async () => {
        req.body = {orderNo: 'order-1'}
        failOrderAndReopenBasket.mockResolvedValue('newBasket-1')

        await paymentCancelExpress(req, res, next)

        expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, 'order-1', {
            reopenBasket: true,
            removeShippingAddress: true
        })
        expect(revertCheckoutStateForExpress).not.toHaveBeenCalled()
        expect(res.locals.response).toEqual({newBasketId: 'newBasket-1'})
        expect(next).toHaveBeenCalledWith()
    })

    it('should fall back to c_orderNo on the basket', async () => {
        res.locals.adyen = {basket: {basketId: 'b1', c_orderNo: 'order-2'}}
        failOrderAndReopenBasket.mockResolvedValue('newBasket-2')

        await paymentCancelExpress(req, res, next)

        expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, 'order-2', {
            reopenBasket: true,
            removeShippingAddress: true
        })
        expect(res.locals.response).toEqual({newBasketId: 'newBasket-2'})
    })

    it('should not reopen the basket for a temporary (PDP) express basket', async () => {
        req.body = {orderNo: 'order-3', isTemporaryBasket: true}
        failOrderAndReopenBasket.mockResolvedValue(null)

        await paymentCancelExpress(req, res, next)

        expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, 'order-3', {
            reopenBasket: false,
            removeShippingAddress: true
        })
        expect(res.locals.response).toEqual({newBasketId: null})
    })

    it('should revert the basket when the order does not exist yet', async () => {
        req.body = {orderNo: 'order-4'}
        failOrderAndReopenBasket.mockRejectedValue(
            new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 404)
        )
        revertCheckoutStateForExpress.mockResolvedValue(undefined)

        await paymentCancelExpress(req, res, next)

        expect(revertCheckoutStateForExpress).toHaveBeenCalledWith(
            res.locals.adyen,
            'paymentCancelExpress'
        )
        expect(res.locals.response).toEqual({})
        expect(next).toHaveBeenCalledWith()
    })

    it('should throw an AdyenError when the adyen context is missing', async () => {
        req.body = {orderNo: 'order-6'}
        res.locals = {}

        await paymentCancelExpress(req, res, next)

        expect(failOrderAndReopenBasket).not.toHaveBeenCalled()
        expect(revertCheckoutStateForExpress).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                message: ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND,
                statusCode: 500
            })
        )
    })

    it('should propagate errors other than order not found', async () => {
        req.body = {orderNo: 'order-5'}
        const invalidOrderError = new AdyenError(ERROR_MESSAGE.INVALID_ORDER, 404)
        failOrderAndReopenBasket.mockRejectedValue(invalidOrderError)

        await paymentCancelExpress(req, res, next)

        expect(revertCheckoutStateForExpress).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(invalidOrderError)
    })
})
