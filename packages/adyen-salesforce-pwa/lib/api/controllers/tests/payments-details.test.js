import {PaymentsDetailsController} from '../../index'
import {RESULT_CODES} from '../../../utils/constants.mjs'
import {AdyenError} from '../../models/AdyenError'

let mockPaymentsDetails = jest.fn()
jest.mock('../checkout-config', () => {
    return {
        getInstance: jest.fn().mockImplementation(() => {
            return {
                paymentsDetails: mockPaymentsDetails
            }
        })
    }
})
describe('payments details controller', () => {
    let req, res, next, consoleInfoSpy, consoleErrorSpy
    afterEach(() => {
        mockPaymentsDetails.mockReset()
    })
    beforeEach(() => {
        req = {
            headers: {
                authorization: 'mockToken',
                customerid: 'testCustomer'
            },
            body: {
                data: {}
            },
            query: {
                siteId: 'RefArch'
            }
        }
        res = {
            locals: {}
        }
        next = jest.fn()
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    it('returns checkout response if payments details response is successful', async () => {
        mockPaymentsDetails.mockImplementationOnce(() => {
            return {
                resultCode: RESULT_CODES.AUTHORISED,
                merchantReference: 'reference123'
            }
        })

        await PaymentsDetailsController(req, res, next)
        expect(res.locals.response).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'reference123'
        })
        expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain('sendPaymentDetails start')
        expect(consoleInfoSpy.mock.calls[1][0]).toContain(
            'sendPaymentDetails resultCode Authorised'
        )
        expect(next).toHaveBeenCalled()
    })
    it('returns error response if payments details response is unsuccessful', async () => {
        mockPaymentsDetails.mockImplementationOnce(() => {
            return {
                resultCode: RESULT_CODES.ERROR,
                merchantReference: 'reference123'
            }
        })

        await PaymentsDetailsController(req, res, next)
        expect(res.locals.response).toBeNil()
        expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain('sendPaymentDetails start')
        expect(consoleInfoSpy.mock.calls[1][0]).toContain('sendPaymentDetails resultCode Error')
        expect(consoleErrorSpy).toHaveBeenCalled()
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('payments details call not successful')
        expect(next).toHaveBeenCalledWith(
            new AdyenError('payments details call not successful', 400)
        )
    })
})
