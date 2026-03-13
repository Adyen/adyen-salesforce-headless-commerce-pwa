import {AdyenError} from '../AdyenError.js'

describe('AdyenError', () => {
    it('should create an error with message, statusCode, and cause', () => {
        const cause = {detail: 'some cause'}
        const error = new AdyenError('test error', 400, cause)

        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(AdyenError)
        expect(error.message).toBe('test error')
        expect(error.name).toBe('AdyenError')
        expect(error.statusCode).toBe(400)
        expect(error.cause).toBe(cause)
    })

    it('should work without Error.captureStackTrace', () => {
        const original = Error.captureStackTrace
        Error.captureStackTrace = undefined
        const error = new AdyenError('no capture', 500)
        expect(error.message).toBe('no capture')
        expect(error.statusCode).toBe(500)
        Error.captureStackTrace = original
    })
})
