import {prepareOrderRequestContext} from '../order-request-context.js'
import {createShopperOrderClient} from '../../helpers/orderHelper.js'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../../models/logger.js'
import {AdyenError} from '../../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

// Mock dependencies
jest.mock('../../helpers/orderHelper.js')
jest.mock('../../helpers/customerHelper.js')
jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs')
jest.mock('../../models/logger.js')

import {getCustomer} from '../../helpers/customerHelper.js'

describe('prepareOrderRequestContext middleware', () => {
    let req, res, next
    let mockShopperOrders

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup mock shopper orders client
        mockShopperOrders = {
            getOrder: jest.fn()
        }
        createShopperOrderClient.mockReturnValue(mockShopperOrders)

        req = {
            originalUrl: '/api/adyen/donations',
            headers: {
                authorization: 'Bearer mockToken',
                customerid: 'mockCustomerId',
                orderno: 'mockOrderNo123'
            },
            query: {
                siteId: 'RefArch'
            }
        }
        res = {
            locals: {}
        }
        next = jest.fn()
    })

    describe('validation - missing parameters', () => {
        test('should call next with error when authorization header is missing', async () => {
            req.headers.authorization = undefined

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
        })

        test('should call next with error when customerid header is missing', async () => {
            req.headers.customerid = undefined

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
        })

        test('should call next with error when orderno header is missing', async () => {
            req.headers.orderno = undefined

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
        })

        test('should call next with error when siteId query param is missing', async () => {
            req.query.siteId = undefined

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith(
                'prepareOrderRequestContext for /api/adyen/donations',
                'Missing required parameters: siteId query param'
            )
        })

        test('should call next with error when headers have "undefined" string value', async () => {
            req.headers.authorization = 'undefined'

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
        })

        test('should call next with error when headers have "null" string value', async () => {
            req.headers.customerid = 'null'

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
        })
    })

    describe('ownership and order verification', () => {
        test('should call next with error when shopperOrder has no orderNo (order not found)', async () => {
            mockShopperOrders.getOrder.mockResolvedValue({})
            getCustomer.mockResolvedValue({customerId: 'mockCustomerId'})

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 404)
            expect(next).toHaveBeenCalledWith(expectedError)
        })

        test('should call next with error when shopperOrder.customerInfo.customerId does not match customerid header', async () => {
            mockShopperOrders.getOrder.mockResolvedValue({
                orderNo: 'mockOrderNo123',
                customerInfo: {customerId: 'differentCustomerId'}
            })
            getCustomer.mockResolvedValue({customerId: 'mockCustomerId'})

            await prepareOrderRequestContext(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_ORDER, 404)
            expect(next).toHaveBeenCalledWith(expectedError)
        })
    })

    describe('error handling', () => {
        test('should call next with error when getCustomer throws', async () => {
            const mockError = new Error('Failed to fetch customer')
            mockShopperOrders.getOrder.mockResolvedValue({
                orderNo: 'mockOrderNo123',
                customerInfo: {customerId: 'mockCustomerId'}
            })
            getCustomer.mockRejectedValue(mockError)

            await prepareOrderRequestContext(req, res, next)

            expect(next).toHaveBeenCalledWith(mockError)
            expect(Logger.error).toHaveBeenCalledWith(
                'prepareOrderRequestContext for /api/adyen/donations',
                mockError.stack
            )
        })

        test('should call next with error when getAdyenConfigForCurrentSite throws', async () => {
            const mockError = new Error('Failed to get config')
            mockShopperOrders.getOrder.mockResolvedValue({
                orderNo: 'mockOrderNo123',
                customerInfo: {customerId: 'mockCustomerId'}
            })
            getCustomer.mockResolvedValue({customerId: 'mockCustomerId'})
            getAdyenConfigForCurrentSite.mockImplementation(() => {
                throw mockError
            })

            await prepareOrderRequestContext(req, res, next)

            expect(next).toHaveBeenCalledWith(mockError)
            expect(Logger.error).toHaveBeenCalledWith(
                'prepareOrderRequestContext for /api/adyen/donations',
                mockError.stack
            )
        })
    })

    describe('happy path', () => {
        test('should successfully prepare context with all required data', async () => {
            const mockShopperOrder = {
                orderNo: 'mockOrderNo123',
                customerInfo: {customerId: 'mockCustomerId'}
            }
            const mockCustomer = {customerId: 'mockCustomerId', email: 'test@example.com'}
            const mockAdminOrder = {
                orderNo: 'mockOrderNo123',
                total: 100.0,
                currency: 'USD',
                c_donationToken: 'donationToken123',
                c_pspReference: 'pspRef123'
            }
            const mockAdyenConfig = {merchantAccount: 'mockAccount'}

            mockShopperOrders.getOrder.mockResolvedValue(mockShopperOrder)
            getCustomer.mockResolvedValue(mockCustomer)
            getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

            await prepareOrderRequestContext(req, res, next)

            // Verify createShopperOrderClient called with authorization and siteId
            expect(createShopperOrderClient).toHaveBeenCalledWith('Bearer mockToken', 'RefArch')

            // Verify shopperOrders.getOrder called with trimmed orderno
            expect(mockShopperOrders.getOrder).toHaveBeenCalledWith({
                parameters: {orderNo: 'mockOrderNo123'}
            })

            // Verify getCustomer called with authorization and trimmed customerid
            expect(getCustomer).toHaveBeenCalledWith('Bearer mockToken', 'mockCustomerId')

            // Verify getAdyenConfigForCurrentSite called with siteId
            expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch')

            // Verify res.locals.adyen contains expected properties
            expect(res.locals.adyen).toBeDefined()
            expect(res.locals.adyen.order).toEqual(mockShopperOrder)
            expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
            expect(res.locals.adyen.siteId).toBe('RefArch')
            expect(res.locals.adyen.authorization).toBe('Bearer mockToken')
            expect(res.locals.adyen.customerId).toBe('mockCustomerId')
            expect(res.locals.adyen.customer).toEqual(mockCustomer)

            // Verify next() called with no arguments
            expect(next).toHaveBeenCalledWith()
            expect(next).toHaveBeenCalledTimes(1)

            // Verify Logger.info called with success
            expect(Logger.info).toHaveBeenCalledWith(
                'prepareOrderRequestContext for /api/adyen/donations',
                'success'
            )
        })
    })

    describe('whitespace trimming', () => {
        test('should trim whitespace from customerid and orderno headers', async () => {
            req.headers.customerid = '  mockCustomerId  '
            req.headers.orderno = '  mockOrderNo123  '

            const mockShopperOrder = {
                orderNo: 'mockOrderNo123',
                customerInfo: {customerId: 'mockCustomerId'}
            }
            const mockCustomer = {customerId: 'mockCustomerId'}
            const mockAdyenConfig = {merchantAccount: 'mockAccount'}

            mockShopperOrders.getOrder.mockResolvedValue(mockShopperOrder)
            getCustomer.mockResolvedValue(mockCustomer)
            getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

            await prepareOrderRequestContext(req, res, next)

            // Verify trimmed values are passed to dependencies
            expect(mockShopperOrders.getOrder).toHaveBeenCalledWith({
                parameters: {orderNo: 'mockOrderNo123'}
            })
            expect(getCustomer).toHaveBeenCalledWith('Bearer mockToken', 'mockCustomerId')

            // Verify ownership check uses trimmed customerid
            expect(next).toHaveBeenCalledWith()
        })
    })

    describe('logging', () => {
        test('should log start message with route', async () => {
            const mockShopperOrder = {
                orderNo: 'mockOrderNo123',
                customerInfo: {customerId: 'mockCustomerId'}
            }
            const mockCustomer = {customerId: 'mockCustomerId'}
            const mockAdyenConfig = {merchantAccount: 'mockAccount'}

            mockShopperOrders.getOrder.mockResolvedValue(mockShopperOrder)
            getCustomer.mockResolvedValue(mockCustomer)
            getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

            await prepareOrderRequestContext(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith(
                'prepareOrderRequestContext for /api/adyen/donations',
                'start'
            )
        })

        test('should log missing parameters with correct route', async () => {
            req.headers.authorization = undefined
            req.originalUrl = '/api/adyen/donationCampaigns'

            await prepareOrderRequestContext(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'prepareOrderRequestContext for /api/adyen/donationCampaigns',
                expect.stringContaining('Missing required parameters')
            )
        })
    })
})
