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

    test('should call revertCheckoutState when basket has payment data but no orderNo', async () => {
        req.body.orderNo = null
        res.locals.adyen.basket = {c_paymentData: '{"some":"data"}'}
        getOpenOrderForShopper.mockResolvedValue(null)
        revertCheckoutState.mockResolvedValue(undefined)

        await paymentCancel(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('paymentCancel', 'start')
        expect(getOpenOrderForShopper).toHaveBeenCalledWith('Bearer test-token', 'customer123')
        expect(revertCheckoutState).toHaveBeenCalledWith(res.locals.adyen, 'paymentCancel')
        expect(failOrderAndReopenBasket).not.toHaveBeenCalled()
        expect(res.locals.response).toEqual({})
        expect(next).toHaveBeenCalledWith()
    })

    test('should call failOrderAndReopenBasket when basket has c_orderNo', async () => {
        req.body.orderNo = null
        res.locals.adyen.basket = {c_orderNo: 'ORDER-001'}
        failOrderAndReopenBasket.mockResolvedValue('new-basket-id')

        await paymentCancel(req, res, next)

        expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, 'ORDER-001')
        expect(revertCheckoutState).not.toHaveBeenCalled()
        expect(res.locals.response).toEqual({newBasketId: 'new-basket-id'})
        expect(next).toHaveBeenCalledWith()
    })

    test('should call next with an error if revertCheckoutState throws', async () => {
        req.body.orderNo = null
        res.locals.adyen.basket = {c_paymentData: '{"some":"data"}'}
        getOpenOrderForShopper.mockResolvedValue(null)
        const mockError = new AdyenError('Something went wrong', 500)
        revertCheckoutState.mockRejectedValue(mockError)

        await paymentCancel(req, res, next)

        expect(revertCheckoutState).toHaveBeenCalledWith(res.locals.adyen, 'paymentCancel')
        expect(Logger.error).toHaveBeenCalledWith('paymentCancel', mockError.stack)
        expect(next).toHaveBeenCalledWith(mockError)
    })

    test('should call next with an error if failOrderAndReopenBasket throws', async () => {
        req.body.orderNo = null
        res.locals.adyen.basket = {c_orderNo: 'ORDER-001'}
        const mockError = new AdyenError('Order fail error', 500)
        failOrderAndReopenBasket.mockRejectedValue(mockError)

        await paymentCancel(req, res, next)

        expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, 'ORDER-001')
        expect(Logger.error).toHaveBeenCalledWith('paymentCancel', mockError.stack)
        expect(next).toHaveBeenCalledWith(mockError)
    })
})
