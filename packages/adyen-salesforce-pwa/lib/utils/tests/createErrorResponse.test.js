import {createErrorResponse} from '../createErrorResponse.mjs'

describe('createErrorResponse', () => {
    it('should create an error response with default message', () => {
        const errorResponse = createErrorResponse()
        expect(errorResponse).toEqual({
            error: true,
            errorMessage: 'Technical error!'
        })
    })

    it('should create an error response with custom message', () => {
        const customErrorMessage = 'Custom error message'
        const errorResponse = createErrorResponse(customErrorMessage)
        expect(errorResponse).toEqual({
            error: true,
            errorMessage: customErrorMessage
        })
    })
})
