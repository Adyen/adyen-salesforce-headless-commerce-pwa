import updateShopperDetails from '../shopper-details'
import Logger from '../../models/logger'

jest.mock('../../models/logger')

describe('updateShopperDetails controller', () => {
    let req
    let res
    let next
    let mockBasketService
    let mockAdyenContext

    beforeEach(() => {
        mockBasketService = {
            addShopperData: jest.fn()
        }

        mockAdyenContext = {
            basketService: mockBasketService,
            basket: {
                basketId: 'basket123',
                currency: 'USD'
            }
        }

        req = {
            body: {
                data: {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe'
                }
            }
        }

        res = {
            locals: {
                adyen: mockAdyenContext
            }
        }

        next = jest.fn()

        Logger.info = jest.fn()
        Logger.error = jest.fn()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('successful update', () => {
        it('should successfully update shopper details', async () => {
            const mockUpdatedBasket = {
                basketId: 'basket123',
                customerInfo: {
                    email: 'test@example.com',
                    customerId: 'customer123'
                }
            }

            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('updateShopperDetails', 'start')
            expect(Logger.info).toHaveBeenCalledWith('updateShopperDetails', 'success')

            expect(mockBasketService.addShopperData).toHaveBeenCalledWith({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe'
            })

            expect(res.locals.response).toEqual(mockUpdatedBasket)
            expect(next).toHaveBeenCalledWith()
        })

        it('should handle empty shopper data', async () => {
            req.body.data = {}
            const mockUpdatedBasket = {basketId: 'basket123'}

            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(mockBasketService.addShopperData).toHaveBeenCalledWith({})
            expect(res.locals.response).toEqual(mockUpdatedBasket)
            expect(next).toHaveBeenCalledWith()
        })

        it('should handle complex shopper data', async () => {
            req.body.data = {
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+1234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    postalCode: '10001',
                    country: 'US'
                },
                preferences: {
                    newsletter: true,
                    sms: false
                }
            }

            const mockUpdatedBasket = {
                basketId: 'basket123',
                customerInfo: {
                    email: 'test@example.com'
                }
            }

            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(mockBasketService.addShopperData).toHaveBeenCalledWith(req.body.data)
            expect(res.locals.response).toEqual(mockUpdatedBasket)
        })

        it('should handle shopper data with null values', async () => {
            req.body.data = {
                email: 'test@example.com',
                phone: null,
                address: null
            }

            const mockUpdatedBasket = {basketId: 'basket123'}
            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(mockBasketService.addShopperData).toHaveBeenCalledWith({
                email: 'test@example.com',
                phone: null,
                address: null
            })
            expect(res.locals.response).toEqual(mockUpdatedBasket)
        })

        it('should handle shopper data with undefined values', async () => {
            req.body.data = {
                email: 'test@example.com',
                phone: undefined
            }

            const mockUpdatedBasket = {basketId: 'basket123'}
            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(mockBasketService.addShopperData).toHaveBeenCalledWith({
                email: 'test@example.com',
                phone: undefined
            })
        })

        it('should handle basket response with additional fields', async () => {
            const mockUpdatedBasket = {
                basketId: 'basket123',
                currency: 'USD',
                orderTotal: 100.5,
                customerInfo: {
                    email: 'test@example.com',
                    customerId: 'customer123',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York'
                }
            }

            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(res.locals.response).toEqual(mockUpdatedBasket)
        })
    })

    describe('error handling', () => {
        it('should handle error from basketService.addShopperData', async () => {
            const error = new Error('Failed to add shopper data')
            mockBasketService.addShopperData.mockRejectedValue(error)

            await updateShopperDetails(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('updateShopperDetails', expect.any(String))
            expect(next).toHaveBeenCalledWith(error)
            expect(res.locals.response).toBeUndefined()
        })

        it('should log error stack trace', async () => {
            const error = new Error('Test error')
            error.stack = 'Error: Test error\n    at test.js:1:1'
            mockBasketService.addShopperData.mockRejectedValue(error)

            await updateShopperDetails(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'updateShopperDetails',
                'Error: Test error\n    at test.js:1:1'
            )
        })

        it('should handle validation error', async () => {
            const validationError = new Error('Invalid email format')
            validationError.statusCode = 400
            mockBasketService.addShopperData.mockRejectedValue(validationError)

            await updateShopperDetails(req, res, next)

            expect(Logger.error).toHaveBeenCalled()
            expect(next).toHaveBeenCalledWith(validationError)
        })

        it('should handle network error', async () => {
            const networkError = new Error('Network timeout')
            networkError.code = 'ETIMEDOUT'
            mockBasketService.addShopperData.mockRejectedValue(networkError)

            await updateShopperDetails(req, res, next)

            expect(Logger.error).toHaveBeenCalled()
            expect(next).toHaveBeenCalledWith(networkError)
        })

        it('should handle missing adyenContext', async () => {
            res.locals.adyen = undefined

            await updateShopperDetails(req, res, next)

            expect(Logger.error).toHaveBeenCalled()
            expect(next).toHaveBeenCalledWith(expect.any(Error))
        })

        it('should handle missing basketService', async () => {
            res.locals.adyen.basketService = undefined

            await updateShopperDetails(req, res, next)

            expect(Logger.error).toHaveBeenCalled()
            expect(next).toHaveBeenCalledWith(expect.any(Error))
        })

        it('should handle missing request body data', async () => {
            req.body = {}
            const mockUpdatedBasket = {basketId: 'basket123'}
            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(mockBasketService.addShopperData).toHaveBeenCalledWith(undefined)
            expect(res.locals.response).toEqual(mockUpdatedBasket)
            expect(next).toHaveBeenCalledWith()
        })
    })

    describe('logging', () => {
        beforeEach(() => {
            mockBasketService.addShopperData.mockResolvedValue({basketId: 'basket123'})
        })

        it('should log start message', async () => {
            await updateShopperDetails(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('updateShopperDetails', 'start')
        })

        it('should log success message', async () => {
            await updateShopperDetails(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('updateShopperDetails', 'success')
        })

        it('should log info messages in correct order', async () => {
            await updateShopperDetails(req, res, next)

            const infoCalls = Logger.info.mock.calls
            expect(infoCalls[0]).toEqual(['updateShopperDetails', 'start'])
            expect(infoCalls[1]).toEqual(['updateShopperDetails', 'success'])
        })

        it('should not log success when error occurs', async () => {
            const error = new Error('Test error')
            mockBasketService.addShopperData.mockRejectedValue(error)

            await updateShopperDetails(req, res, next)

            const successCalls = Logger.info.mock.calls.filter((call) => call[1] === 'success')
            expect(successCalls).toHaveLength(0)
        })
    })

    describe('response handling', () => {
        it('should set response in res.locals', async () => {
            const mockUpdatedBasket = {
                basketId: 'basket123',
                customerInfo: {email: 'test@example.com'}
            }
            mockBasketService.addShopperData.mockResolvedValue(mockUpdatedBasket)

            await updateShopperDetails(req, res, next)

            expect(res.locals.response).toBe(mockUpdatedBasket)
        })

        it('should call next without arguments on success', async () => {
            mockBasketService.addShopperData.mockResolvedValue({basketId: 'basket123'})

            await updateShopperDetails(req, res, next)

            expect(next).toHaveBeenCalledWith()
            expect(next).toHaveBeenCalledTimes(1)
        })

        it('should call next with error on failure', async () => {
            const error = new Error('Test error')
            mockBasketService.addShopperData.mockRejectedValue(error)

            await updateShopperDetails(req, res, next)

            expect(next).toHaveBeenCalledWith(error)
            expect(next).toHaveBeenCalledTimes(1)
        })

        it('should not modify response on error', async () => {
            const error = new Error('Test error')
            mockBasketService.addShopperData.mockRejectedValue(error)

            await updateShopperDetails(req, res, next)

            expect(res.locals.response).toBeUndefined()
        })
    })
})
