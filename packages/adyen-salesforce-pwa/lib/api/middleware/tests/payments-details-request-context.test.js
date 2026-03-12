import {preparePaymentsDetailsContext} from '../payments-details-request-context'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'
import {getBasket, getCurrentBasketForAuthorizedShopper} from '../../helpers/basketHelper'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../../models/logger'
import {BasketService} from '../../models/basketService'
import {getCustomer} from '../../helpers/customerHelper'

// Mock dependencies
jest.mock('../../helpers/basketHelper')
jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs')
jest.mock('../../models/logger')
jest.mock('../../models/basketService')
jest.mock('../../helpers/customerHelper')

describe('preparePaymentsDetailsContext middleware', () => {
    let mockReq, mockRes, mockNext

    beforeEach(() => {
        jest.clearAllMocks()

        mockReq = {
            originalUrl: '/api/adyen/payments/details',
            headers: {
                authorization: 'Bearer test-token',
                basketid: 'basket-123',
                customerid: 'customer-456'
            },
            query: {
                siteId: 'RefArch'
            }
        }

        mockRes = {
            locals: {}
        }

        mockNext = jest.fn()

        // Setup default mocks
        getAdyenConfigForCurrentSite.mockReturnValue({
            apiKey: 'test-key',
            environment: 'test'
        })

        getBasket.mockResolvedValue({
            basketId: 'basket-123',
            productItems: []
        })

        getCurrentBasketForAuthorizedShopper.mockResolvedValue({
            basketId: 'current-basket-456',
            productItems: []
        })

        getCustomer.mockResolvedValue({
            customerId: 'customer-456',
            email: 'test@example.com'
        })

        BasketService.mockImplementation(() => ({}))
    })

    describe('parameter validation', () => {
        it('should return error when authorization header is missing', async () => {
            delete mockReq.headers.authorization

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Missing required parameters: authorization header'
            )
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: ERROR_MESSAGE.INVALID_PARAMS
                })
            )
        })

        it('should return error when customerid header is missing', async () => {
            delete mockReq.headers.customerid

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Missing required parameters: customerid header'
            )
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: ERROR_MESSAGE.INVALID_PARAMS
                })
            )
        })

        it('should return error when siteId query param is missing', async () => {
            delete mockReq.query.siteId

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Missing required parameters: siteId query param'
            )
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: ERROR_MESSAGE.INVALID_PARAMS
                })
            )
        })

        it('should return error when authorization is "undefined"', async () => {
            mockReq.headers.authorization = 'undefined'

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: ERROR_MESSAGE.INVALID_PARAMS
                })
            )
        })

        it('should return error when customerid is "null"', async () => {
            mockReq.headers.customerid = 'null'

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: ERROR_MESSAGE.INVALID_PARAMS
                })
            )
        })

        it('should return error when multiple parameters are missing', async () => {
            delete mockReq.headers.authorization
            delete mockReq.query.siteId

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Missing required parameters: authorization header, siteId query param'
            )
        })
    })

    describe('successful context preparation with basket', () => {
        it('should create adyen context with basket and customer', async () => {
            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'start'
            )
            expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch')
            expect(getBasket).toHaveBeenCalledWith(
                'Bearer test-token',
                'basket-123',
                'customer-456',
                'RefArch'
            )
            expect(getCustomer).toHaveBeenCalledWith('Bearer test-token', 'customer-456', 'RefArch')
            expect(BasketService).toHaveBeenCalled()

            const adyenContext = mockRes.locals.adyen
            expect(adyenContext).toMatchObject({
                basket: {basketId: 'basket-123', productItems: []},
                adyenConfig: {apiKey: 'test-key', environment: 'test'},
                siteId: 'RefArch',
                authorization: 'Bearer test-token',
                customerId: 'customer-456',
                customer: {customerId: 'customer-456', email: 'test@example.com'}
            })
            expect(adyenContext.basketService).toBeDefined()

            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'success with basket'
            )
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should trim basketid and customerid', async () => {
            mockReq.headers.basketid = '  basket-123  '
            mockReq.headers.customerid = '  customer-456  '

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(getBasket).toHaveBeenCalledWith(
                'Bearer test-token',
                'basket-123',
                'customer-456',
                'RefArch'
            )
            expect(getCustomer).toHaveBeenCalledWith('Bearer test-token', 'customer-456', 'RefArch')
        })
    })

    describe('basket not found scenarios', () => {
        it('should fall back to current basket when basket returns 404', async () => {
            const basketNotFoundError = new Error('Basket not found')
            basketNotFoundError.statusCode = 404
            getBasket.mockRejectedValue(basketNotFoundError)

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Basket basket-123 not found, falling back to current basket'
            )
            expect(getCurrentBasketForAuthorizedShopper).toHaveBeenCalledWith(
                'Bearer test-token',
                'customer-456',
                'RefArch'
            )
            expect(mockRes.locals.adyen.basket).toEqual({
                basketId: 'current-basket-456',
                productItems: []
            })
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should handle basket fetch errors gracefully', async () => {
            const basketError = new Error('Basket service unavailable')
            getBasket.mockRejectedValue(basketError)

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Basket not available (Basket service unavailable) — using minimal context'
            )
            expect(mockRes.locals.adyen.basket).toEqual({})
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should handle non-404 basket errors by throwing', async () => {
            const basketError = new Error('Unauthorized')
            basketError.statusCode = 401
            getBasket.mockRejectedValue(basketError)

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Basket not available (Unauthorized) — using minimal context'
            )
            expect(mockNext).toHaveBeenCalledWith()
        })
    })

    describe('minimal context (no basketid)', () => {
        it('should create minimal context when basketid is not provided', async () => {
            delete mockReq.headers.basketid

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(getBasket).not.toHaveBeenCalled()
            expect(getCurrentBasketForAuthorizedShopper).not.toHaveBeenCalled()
            expect(getCustomer).not.toHaveBeenCalled()

            const adyenContext = mockRes.locals.adyen
            expect(adyenContext.basket).toEqual({})
            expect(adyenContext.customer).toBeNull()

            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'success with minimal context (no basket)'
            )
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should handle when basketid is invalid value', async () => {
            mockReq.headers.basketid = 'null'

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(getBasket).not.toHaveBeenCalled()
            expect(mockRes.locals.adyen.basket).toEqual({})
            expect(mockNext).toHaveBeenCalledWith()
        })
    })

    describe('error handling', () => {
        it('should handle getAdyenConfig errors', async () => {
            const configError = new Error('Configuration not found')
            getAdyenConfigForCurrentSite.mockImplementation(() => {
                throw configError
            })

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                configError.stack
            )
            expect(mockNext).toHaveBeenCalledWith(configError)
        })

        it('should handle getCustomer errors', async () => {
            const customerError = new Error('Customer not found')
            getCustomer.mockRejectedValue(customerError)

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                'Basket not available (Customer not found) — using minimal context'
            )
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should handle BasketService constructor errors', async () => {
            const serviceError = new Error('BasketService initialization failed')
            BasketService.mockImplementation(() => {
                throw serviceError
            })

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('prepareRequestContext'),
                serviceError.stack
            )
            expect(mockNext).toHaveBeenCalledWith(serviceError)
        })
    })

    describe('edge cases', () => {
        it('should handle when customer returns null', async () => {
            getCustomer.mockResolvedValue(null)

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(mockRes.locals.adyen.customer).toBeNull()
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should handle when getCurrentBasketForAuthorizedShopper returns null', async () => {
            const basketNotFoundError = new Error('Basket not found')
            basketNotFoundError.statusCode = 404
            getBasket.mockRejectedValue(basketNotFoundError)
            getCurrentBasketForAuthorizedShopper.mockResolvedValue(null)

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(mockRes.locals.adyen.basket).toEqual({})
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should handle empty string values as invalid', async () => {
            mockReq.headers.authorization = ''
            mockReq.headers.customerid = 'customer-456'
            mockReq.query.siteId = 'RefArch'

            await preparePaymentsDetailsContext(mockReq, mockRes, mockNext)

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: ERROR_MESSAGE.INVALID_PARAMS
                })
            )
        })
    })
})
