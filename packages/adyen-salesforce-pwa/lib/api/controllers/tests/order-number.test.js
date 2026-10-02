import getOrderNumber from '../order-number'
import Logger from '../../models/logger'
import {CustomShopperOrderApiClient} from '../../models/customShopperOrderApi'
import {createShopperOrderClient} from '../../helpers/orderHelper.js'

// Mock dependencies
jest.mock('../../models/logger')
jest.mock('../../models/customShopperOrderApi')
jest.mock('../../helpers/orderHelper.js', () => ({
    createShopperOrderClient: jest.fn()
}))

const mockGetOrder = jest.fn()

describe('getOrderNumber controller', () => {
    let mockReq, mockRes, mockNext, mockAdyenContext, mockBasketService

    beforeEach(() => {
        jest.clearAllMocks()

        mockBasketService = {
            update: jest.fn().mockResolvedValue({})
        }

        mockAdyenContext = {
            authorization: 'Bearer test-token',
            basket: {
                basketId: 'test-basket-id',
                c_orderNo: null
            },
            basketService: mockBasketService
        }

        mockReq = {}
        mockRes = {
            locals: {
                adyen: mockAdyenContext
            }
        }
        mockNext = jest.fn()
        mockGetOrder.mockResolvedValue({})
        createShopperOrderClient.mockReturnValue({getOrder: mockGetOrder})

        // Mock the CustomShopperOrderApiClient constructor
        CustomShopperOrderApiClient.mockImplementation(() => ({
            generateOrderNo: jest.fn().mockResolvedValue('ORDER-12345')
        }))
    })

    describe('when adyen context is missing', () => {
        it('should throw AdyenError with ADYEN_CONTEXT_NOT_FOUND message', async () => {
            mockRes.locals.adyen = null

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Adyen context not found')
                })
            )
            expect(Logger.info).toHaveBeenCalledWith('getOrderNumber', 'start')
        })
    })

    describe('when existing order number is present', () => {
        it('should reuse the number when no order exists', async () => {
            mockAdyenContext.basket.c_orderNo = 'EXISTING-ORDER-999'

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(mockGetOrder).toHaveBeenCalledWith({
                parameters: {orderNo: 'EXISTING-ORDER-999'}
            })
            expect(Logger.info).toHaveBeenCalledWith(
                'getOrderNumber',
                'Reusing existing order number: EXISTING-ORDER-999'
            )
            expect(mockRes.locals.response).toEqual({orderNo: 'EXISTING-ORDER-999'})
            expect(mockNext).toHaveBeenCalledWith()
            expect(CustomShopperOrderApiClient).not.toHaveBeenCalled()
            expect(mockBasketService.update).not.toHaveBeenCalled()
        })

        it('should reuse the number when its order is still created', async () => {
            mockAdyenContext.basket.c_orderNo = 'CREATED-ORDER-999'
            mockGetOrder.mockResolvedValue({orderNo: 'CREATED-ORDER-999', status: 'created'})

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(mockRes.locals.response).toEqual({orderNo: 'CREATED-ORDER-999'})
            expect(CustomShopperOrderApiClient).not.toHaveBeenCalled()
            expect(mockBasketService.update).not.toHaveBeenCalled()
        })

        it('should log and reuse the number when the order does not exist', async () => {
            mockAdyenContext.basket.c_orderNo = 'UNUSED-ORDER-999'
            mockGetOrder.mockRejectedValue(
                Object.assign(new Error('Order not found'), {statusCode: 404})
            )

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(Logger.info).toHaveBeenCalledWith(
                'getOrderNumber',
                'Order number UNUSED-ORDER-999 does not exist yet; reusing it'
            )
            expect(Logger.error).not.toHaveBeenCalled()
            expect(mockRes.locals.response).toEqual({orderNo: 'UNUSED-ORDER-999'})
            expect(CustomShopperOrderApiClient).not.toHaveBeenCalled()
            expect(mockBasketService.update).not.toHaveBeenCalled()
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should log unexpected lookup failures as errors before reusing the number', async () => {
            mockAdyenContext.basket.c_orderNo = 'UNVERIFIED-ORDER-999'
            mockGetOrder.mockRejectedValue(new Error('Lookup failed'))

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith(
                'getOrderNumber',
                'Could not verify order number UNVERIFIED-ORDER-999 (Lookup failed); reusing it'
            )
            expect(mockRes.locals.response).toEqual({orderNo: 'UNVERIFIED-ORDER-999'})
            expect(CustomShopperOrderApiClient).not.toHaveBeenCalled()
            expect(mockBasketService.update).not.toHaveBeenCalled()
            expect(mockNext).toHaveBeenCalledWith()
        })
    })

    describe('when existing order number belongs to a placed order', () => {
        it.each(['new', 'completed', 'cancelled', 'failed', 'failed_with_reopen', 'unknown'])(
            'should replace a %s order number before starting another payment',
            async (status) => {
                mockAdyenContext.basket.c_orderNo = 'SPENT-ORDER-999'
                mockGetOrder.mockResolvedValue({orderNo: 'SPENT-ORDER-999', status})

                await getOrderNumber(mockReq, mockRes, mockNext)

                expect(mockGetOrder).toHaveBeenCalledWith({
                    parameters: {orderNo: 'SPENT-ORDER-999'}
                })
                expect(mockBasketService.update).toHaveBeenCalledWith({c_orderNo: 'ORDER-12345'})
                expect(mockRes.locals.response).toEqual({orderNo: 'ORDER-12345'})
                expect(mockNext).toHaveBeenCalledWith()
            }
        )
    })

    describe('when no existing order number', () => {
        it('should generate new order number and update basket', async () => {
            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(Logger.info).toHaveBeenCalledWith('getOrderNumber', 'start')
            expect(CustomShopperOrderApiClient).toHaveBeenCalledTimes(1)

            const mockApiClient = CustomShopperOrderApiClient.mock.results[0].value
            expect(mockApiClient.generateOrderNo).toHaveBeenCalledWith('Bearer test-token')

            expect(mockBasketService.update).toHaveBeenCalledWith({c_orderNo: 'ORDER-12345'})
            expect(Logger.info).toHaveBeenCalledWith(
                'getOrderNumber',
                'Generated order number: ORDER-12345'
            )
            expect(mockRes.locals.response).toEqual({orderNo: 'ORDER-12345'})
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should throw AdyenError when generateOrderNo returns null', async () => {
            CustomShopperOrderApiClient.mockImplementation(() => ({
                generateOrderNo: jest.fn().mockResolvedValue(null)
            }))

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Failed to generate order number'
                })
            )
            expect(Logger.info).toHaveBeenCalledWith('getOrderNumber', 'start')
            expect(Logger.error).toHaveBeenCalled()
        })

        it('should throw AdyenError when generateOrderNo returns empty string', async () => {
            CustomShopperOrderApiClient.mockImplementation(() => ({
                generateOrderNo: jest.fn().mockResolvedValue('')
            }))

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Failed to generate order number'
                })
            )
            expect(Logger.info).toHaveBeenCalledWith('getOrderNumber', 'start')
            expect(Logger.error).toHaveBeenCalled()
        })
    })

    describe('error handling', () => {
        it('should handle errors from generateOrderNo', async () => {
            const apiError = new Error('API connection failed')
            CustomShopperOrderApiClient.mockImplementation(() => ({
                generateOrderNo: jest.fn().mockRejectedValue(apiError)
            }))

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith('getOrderNumber', apiError.stack)
            expect(mockNext).toHaveBeenCalledWith(apiError)
        })

        it('should handle errors from basketService.update', async () => {
            const updateError = new Error('Basket update failed')
            mockBasketService.update.mockRejectedValue(updateError)

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith('getOrderNumber', updateError.stack)
            expect(mockNext).toHaveBeenCalledWith(updateError)
        })

        it('should handle AdyenError thrown from missing context', async () => {
            mockRes.locals.adyen = null

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(Logger.error).toHaveBeenCalledWith('getOrderNumber', expect.any(String))
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Adyen context not found')
                })
            )
        })
    })

    describe('basket edge cases', () => {
        it('should handle when basket is null', async () => {
            mockAdyenContext.basket = null

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(CustomShopperOrderApiClient).toHaveBeenCalledTimes(1)
            expect(mockBasketService.update).toHaveBeenCalledWith({c_orderNo: 'ORDER-12345'})
            expect(mockNext).toHaveBeenCalledWith()
        })

        it('should handle when basket exists but has no c_orderNo', async () => {
            mockAdyenContext.basket = {basketId: 'test-basket-id'}

            await getOrderNumber(mockReq, mockRes, mockNext)

            expect(CustomShopperOrderApiClient).toHaveBeenCalledTimes(1)
            expect(mockBasketService.update).toHaveBeenCalledWith({c_orderNo: 'ORDER-12345'})
            expect(mockNext).toHaveBeenCalledWith()
        })
    })
})
