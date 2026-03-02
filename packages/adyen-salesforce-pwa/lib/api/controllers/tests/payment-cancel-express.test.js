import paymentCancelExpress from '../payment-cancel-express'
import Logger from '../../models/logger'
import {revertCheckoutStateForExpress} from '../../helpers/paymentsHelper.js'

jest.mock('../../models/logger')
jest.mock('../../helpers/paymentsHelper.js', () => ({
    revertCheckoutStateForExpress: jest.fn()
}))

describe('paymentCancelExpress Controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()

        req = {}
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
})
