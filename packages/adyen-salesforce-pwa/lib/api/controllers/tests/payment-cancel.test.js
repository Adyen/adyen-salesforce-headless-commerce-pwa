import paymentCancel from '../payment-cancel'
import {AdyenError} from '../../models/AdyenError'
import Logger from '../../models/logger'
import {revertCheckoutState} from '../../helpers/paymentsHelper.js'

// Mock dependencies
jest.mock('../../models/logger')
jest.mock('../../helpers/paymentsHelper.js', () => ({
    revertCheckoutState: jest.fn()
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
                    /* mock adyenContext */
                }
            }
        }
        next = jest.fn()
    })

    test('should successfully call revertCheckoutState and pass to next middleware', async () => {
        revertCheckoutState.mockResolvedValue(undefined) // Simulate successful helper call

        await paymentCancel(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('paymentCancel', 'start')
        expect(revertCheckoutState).toHaveBeenCalledWith(res.locals.adyen, 'paymentCancel')
        expect(res.locals.response).toEqual({})
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should call next with an error if revertCheckoutState throws an error', async () => {
        const mockError = new AdyenError('Something went wrong', 500)
        revertCheckoutState.mockRejectedValue(mockError)

        await paymentCancel(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('paymentCancel', 'start')
        expect(revertCheckoutState).toHaveBeenCalledWith(res.locals.adyen, 'paymentCancel')
        expect(Logger.error).toHaveBeenCalledWith('paymentCancel', mockError.stack)
        expect(next).toHaveBeenCalledWith(mockError)
    })
})