import {createCheckoutResponse} from '../createCheckoutResponse.mjs'
import {RESULT_CODES} from '../constants.mjs'

describe('createCheckoutResponse', () => {
    it('should return final response for AUTHORISED or RECEIVED resultCode', () => {
        const response = {
            resultCode: RESULT_CODES.AUTHORISED,
            merchantReference: 'reference123'
        }

        const checkoutResponse = createCheckoutResponse(response)
        expect(checkoutResponse).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'reference123'
        })
    })

    it('should return non-final response for REDIRECT SHOPPER resultCode', () => {
        const response = {
            resultCode: RESULT_CODES.REDIRECT_SHOPPER,
            action: 'redirectAction',
            merchantReference: 'reference123'
        }

        const checkoutResponse = createCheckoutResponse(response)
        expect(checkoutResponse).toEqual({
            isFinal: false,
            isSuccessful: true,
            action: 'redirectAction',
            merchantReference: 'reference123'
        })
    })

    it('should return default response for an unknown resultCode', () => {
        const response = {
            resultCode: 'UNKNOWN_RESULT_CODE'
        }

        const checkoutResponse = createCheckoutResponse(response)
        expect(checkoutResponse).toEqual({
            isFinal: true,
            isSuccessful: false
        })
    })
})
