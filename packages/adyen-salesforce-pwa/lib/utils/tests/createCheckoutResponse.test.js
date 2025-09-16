import {createCheckoutResponse} from '../createCheckoutResponse.mjs'
import {RESULT_CODES} from '../constants.mjs'

describe('createCheckoutResponse', () => {
    const orderNo = 'order123'

    it('should return final successful response for AUTHORISED', () => {
        const response = {resultCode: RESULT_CODES.AUTHORISED, merchantReference: 'ref1'}
        const checkoutResponse = createCheckoutResponse(response, orderNo)
        expect(checkoutResponse).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'ref1'
        })
    })

    it('should return final successful response for RECEIVED', () => {
        const response = {resultCode: RESULT_CODES.RECEIVED, merchantReference: 'ref2'}
        const checkoutResponse = createCheckoutResponse(response, orderNo)
        expect(checkoutResponse).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'ref2'
        })
    })

    it('should return non-final successful response for REDIRECT', () => {
        const response = {
            resultCode: RESULT_CODES.REDIRECT,
            action: 'redirectAction',
            merchantReference: 'ref3'
        }
        const checkoutResponse = createCheckoutResponse(response, orderNo)
        expect(checkoutResponse).toEqual({
            isFinal: false,
            isSuccessful: true,
            action: 'redirectAction',
            merchantReference: 'ref3'
        })
    })

    it('should return non-final successful response for PRESENT_TO_SHOPPER', () => {
        const response = {
            resultCode: RESULT_CODES.PRESENT_TO_SHOPPER,
            action: 'presentAction',
            merchantReference: 'ref4'
        }
        const checkoutResponse = createCheckoutResponse(response, orderNo)
        expect(checkoutResponse).toEqual({
            isFinal: false,
            isSuccessful: true,
            action: 'presentAction',
            merchantReference: 'ref4'
        })
    })

    it('should return final unsuccessful response for other resultCodes', () => {
        const response = {resultCode: 'UNKNOWN', merchantReference: 'ref5'}
        const checkoutResponse = createCheckoutResponse(response, orderNo)
        expect(checkoutResponse).toEqual({
            isFinal: true,
            isSuccessful: false,
            merchantReference: 'ref5'
        })
    })

    it('should use orderNo as fallback for merchantReference', () => {
        const response = {resultCode: RESULT_CODES.AUTHORISED}
        const checkoutResponse = createCheckoutResponse(response, orderNo)
        expect(checkoutResponse).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: orderNo
        })
    })
})
