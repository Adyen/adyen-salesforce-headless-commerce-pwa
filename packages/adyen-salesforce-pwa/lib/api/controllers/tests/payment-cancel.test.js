import paymentCancel from '../payment-cancel'
import {AdyenError} from '../../models/AdyenError'
import Logger from '../../models/logger'
import {revertCheckoutState} from '../../helpers/paymentsHelper.js'
import {failOrderAndReopenBasket, getOpenOrderForShopper} from '../../helpers/orderHelper.js'

// Mock dependencies
jest.mock('../../models/logger')
jest.mock('../../helpers/paymentsHelper.js', () => ({
    revertCheckoutState: jest.fn()
}))
jest.mock('../../helpers/orderHelper.js', () => ({
    failOrderAndReopenBasket: jest.fn(),
    getOpenOrderForShopper: jest.fn()
}))

describe('paymentCancel Controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()

        req = {
            body: {
                orderNo: '00012345'
            }
        }
        res = {
            locals: {
                adyen: {
                    basket: {},
                    authorization: 'Bearer test-token',
                    customerId: 'customer123'
                }
            }
        }
        next = jest.fn()
    })

    describe('when orderNo is provided in request body', () => {
        test('should fail order and reopen basket with newBasketId', async () => {
            failOrderAndReopenBasket.mockResolvedValue('new-basket-id')

            await paymentCancel(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('paymentCancel', 'start')
            expect(Logger.info).toHaveBeenCalledWith(
                'paymentCancel',
                'failing order 00012345 and reopening basket'
            )
            expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, '00012345')
            expect(getOpenOrderForShopper).not.toHaveBeenCalled()
            expect(revertCheckoutState).not.toHaveBeenCalled()
            expect(res.locals.response).toEqual({newBasketId: 'new-basket-id'})
            expect(next).toHaveBeenCalledWith()
        })

        test('should fail order and reopen basket without newBasketId', async () => {
            failOrderAndReopenBasket.mockResolvedValue(null)

            await paymentCancel(req, res, next)

            expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, '00012345')
            expect(res.locals.response).toEqual({})
            expect(next).toHaveBeenCalledWith()
        })

        test('should handle errors when failing order', async () => {
            const mockError = new AdyenError('Order fail error', 500)
            failOrderAndReopenBasket.mockRejectedValue(mockError)

            await paymentCancel(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('paymentCancel', mockError.stack)
            expect(next).toHaveBeenCalledWith(mockError)
        })
    })

    describe('when orderNo is not in request body', () => {
        beforeEach(() => {
            req.body.orderNo = null
        })

        test('should use orderNo from basket.c_orderNo', async () => {
            res.locals.adyen.basket = {c_orderNo: 'ORDER-001'}
            failOrderAndReopenBasket.mockResolvedValue('new-basket-id')

            await paymentCancel(req, res, next)

            expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, 'ORDER-001')
            expect(getOpenOrderForShopper).not.toHaveBeenCalled()
            expect(res.locals.response).toEqual({newBasketId: 'new-basket-id'})
            expect(next).toHaveBeenCalledWith()
        })

        test('should get open order when no orderNo in basket', async () => {
            res.locals.adyen.basket = {}
            const openOrder = {orderNo: 'OPEN-ORDER-123'}
            getOpenOrderForShopper.mockResolvedValue(openOrder)
            failOrderAndReopenBasket.mockResolvedValue('new-basket-id')

            await paymentCancel(req, res, next)

            expect(getOpenOrderForShopper).toHaveBeenCalledWith('Bearer test-token', 'customer123')
            expect(failOrderAndReopenBasket).toHaveBeenCalledWith(
                res.locals.adyen,
                'OPEN-ORDER-123'
            )
            expect(res.locals.response).toEqual({newBasketId: 'new-basket-id'})
            expect(next).toHaveBeenCalledWith()
        })

        test('should revert checkout state when basket has c_paymentData', async () => {
            res.locals.adyen.basket = {c_paymentData: '{"some":"data"}'}
            getOpenOrderForShopper.mockResolvedValue(null)
            revertCheckoutState.mockResolvedValue(undefined)

            await paymentCancel(req, res, next)

            expect(getOpenOrderForShopper).toHaveBeenCalledWith('Bearer test-token', 'customer123')
            expect(revertCheckoutState).toHaveBeenCalledWith(res.locals.adyen, 'paymentCancel')
            expect(failOrderAndReopenBasket).not.toHaveBeenCalled()
            expect(res.locals.response).toEqual({})
            expect(next).toHaveBeenCalledWith()
        })

        test('should revert checkout state when basket has c_pspReference', async () => {
            res.locals.adyen.basket = {c_pspReference: 'psp-ref-123'}
            getOpenOrderForShopper.mockResolvedValue(null)
            revertCheckoutState.mockResolvedValue(undefined)

            await paymentCancel(req, res, next)

            expect(revertCheckoutState).toHaveBeenCalledWith(res.locals.adyen, 'paymentCancel')
            expect(res.locals.response).toEqual({})
            expect(next).toHaveBeenCalledWith()
        })

        test('should revert checkout state when basket has c_orderData', async () => {
            res.locals.adyen.basket = {c_orderData: '{"order":"data"}'}
            getOpenOrderForShopper.mockResolvedValue(null)
            revertCheckoutState.mockResolvedValue(undefined)

            await paymentCancel(req, res, next)

            expect(revertCheckoutState).toHaveBeenCalledWith(res.locals.adyen, 'paymentCancel')
            expect(res.locals.response).toEqual({})
            expect(next).toHaveBeenCalledWith()
        })

        test('should skip when no payment data found', async () => {
            res.locals.adyen.basket = {}
            getOpenOrderForShopper.mockResolvedValue(null)

            await paymentCancel(req, res, next)

            expect(getOpenOrderForShopper).toHaveBeenCalledWith('Bearer test-token', 'customer123')
            expect(revertCheckoutState).not.toHaveBeenCalled()
            expect(failOrderAndReopenBasket).not.toHaveBeenCalled()
            expect(Logger.info).toHaveBeenCalledWith(
                'paymentCancel',
                'no abandoned payment found — skipping'
            )
            expect(res.locals.response).toEqual({cancelled: false})
            expect(next).toHaveBeenCalledWith()
        })

        test('should skip when basket is null', async () => {
            res.locals.adyen.basket = null
            getOpenOrderForShopper.mockResolvedValue(null)

            await paymentCancel(req, res, next)

            expect(getOpenOrderForShopper).toHaveBeenCalledWith('Bearer test-token', 'customer123')
            expect(revertCheckoutState).not.toHaveBeenCalled()
            expect(failOrderAndReopenBasket).not.toHaveBeenCalled()
            expect(Logger.info).toHaveBeenCalledWith(
                'paymentCancel',
                'no abandoned payment found — skipping'
            )
            expect(res.locals.response).toEqual({cancelled: false})
            expect(next).toHaveBeenCalledWith()
        })

        test('should handle errors when getting open order', async () => {
            const mockError = new Error('Get order failed')
            getOpenOrderForShopper.mockRejectedValue(mockError)

            await paymentCancel(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('paymentCancel', mockError.stack)
            expect(next).toHaveBeenCalledWith(mockError)
        })

        test('should handle errors when reverting checkout state', async () => {
            res.locals.adyen.basket = {c_paymentData: '{"some":"data"}'}
            getOpenOrderForShopper.mockResolvedValue(null)
            const mockError = new AdyenError('Revert failed', 500)
            revertCheckoutState.mockRejectedValue(mockError)

            await paymentCancel(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('paymentCancel', mockError.stack)
            expect(next).toHaveBeenCalledWith(mockError)
        })
    })

    describe('edge cases', () => {
        test('should handle empty request body', async () => {
            req.body = {}
            res.locals.adyen.basket = {c_orderNo: 'ORDER-001'}
            failOrderAndReopenBasket.mockResolvedValue('new-basket-id')

            await paymentCancel(req, res, next)

            expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, 'ORDER-001')
            expect(res.locals.response).toEqual({newBasketId: 'new-basket-id'})
            expect(next).toHaveBeenCalledWith()
        })

        test('should handle undefined adyen context', async () => {
            res.locals.adyen = undefined

            await paymentCancel(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('paymentCancel', expect.any(String))
            expect(next).toHaveBeenCalledWith(expect.any(Error))
        })

        test('should handle undefined basket in adyen context', async () => {
            req.body.orderNo = null
            res.locals.adyen.basket = undefined
            getOpenOrderForShopper.mockResolvedValue(null)

            await paymentCancel(req, res, next)

            expect(getOpenOrderForShopper).toHaveBeenCalledWith('Bearer test-token', 'customer123')
            expect(Logger.info).toHaveBeenCalledWith(
                'paymentCancel',
                'no abandoned payment found — skipping'
            )
            expect(res.locals.response).toEqual({cancelled: false})
            expect(next).toHaveBeenCalledWith()
        })
    })
})
