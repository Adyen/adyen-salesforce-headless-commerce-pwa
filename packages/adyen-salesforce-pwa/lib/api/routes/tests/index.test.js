import {registerAdyenEndpoints, SuccessHandler, ErrorHandler} from '../index'
import Logger from '../../controllers/logger'

jest.mock('../../controllers/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}))

describe('Adyen Endpoints', () => {
    let app
    let runtime

    beforeEach(() => {
        app = {
            get: jest.fn(),
            post: jest.fn(),
            use: jest.fn()
        }
        runtime = {
            render: jest.fn()
        }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('registerAdyenEndpoints', () => {
        test('should register all Adyen endpoints with appropriate handlers', () => {
            const overrides = {}

            registerAdyenEndpoints(app, runtime, overrides)
            expect(app.get).toHaveBeenCalledTimes(4)
            expect(app.post).toHaveBeenCalledTimes(3)
            expect(app.use).toHaveBeenCalledTimes(1)
        })
    })

    describe('SuccessHandler', () => {
        test('should log success message and send a JSON response with 200 status', () => {
            const req = {}
            const res = {
                status: jest.fn(() => res),
                json: jest.fn(),
                locals: {
                    response: {message: 'Success response'}
                },
                toString: () => 'Response object'
            }

            SuccessHandler(req, res)

            expect(Logger.info).toHaveBeenCalledWith('Success')
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({message: 'Success response'})
        })
    })

    describe('ErrorHandler', () => {
        test('should log error message and send a JSON response with appropriate status', () => {
            const req = {}
            const res = {
                status: jest.fn(() => res),
                json: jest.fn()
            }
            const error = {
                message: 'Error message',
                cause: 'Error cause',
                statusCode: 404
            }

            ErrorHandler(error, req, res)

            expect(Logger.error).toHaveBeenCalledWith('Error message', 'Error cause')
            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith({errorMessage: 'Error message', error: true})
        })
    })
})
