import {AdyenOrderNumberService} from '../order-number'
import {ApiClient} from '../api'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            get: jest.fn()
        }))
    }
})

describe('AdyenOrderNumberService', () => {
    let orderNumberService, mockApiClient

    const mockToken = 'test-token'
    const mockCustomerId = 'customer-123'
    const mockBasketId = 'basket-456'
    const mockSite = {id: 'test-site'}

    beforeEach(() => {
        mockApiClient = {
            get: jest.fn()
        }
        ApiClient.mockImplementation(() => mockApiClient)
        orderNumberService = new AdyenOrderNumberService(
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('constructor', () => {
        it('should create an instance with the correct properties', () => {
            expect(orderNumberService.baseUrl).toBe('/api/adyen/order-number')
            expect(orderNumberService.apiClient).toBe(mockApiClient)
            expect(ApiClient).toHaveBeenCalledWith(
                '/api/adyen/order-number',
                mockToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
        })
    })

    describe('fetchOrderNumber', () => {
        it('should return order number on successful API call', async () => {
            const mockResponse = {orderNo: 'ORDER-12345'}
            const mockFetchPromise = Promise.resolve({
                status: 200,
                json: jest.fn().mockResolvedValue(mockResponse)
            })

            mockApiClient.get.mockResolvedValueOnce(mockFetchPromise)

            const result = await orderNumberService.fetchOrderNumber()

            expect(mockApiClient.get).toHaveBeenCalledWith()
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error when fetchOrderNumber gets a status >= 300', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({errorMessage: 'Order number fetch error'})
            })

            mockApiClient.get.mockResolvedValueOnce(mockFetchPromise)

            await expect(orderNumberService.fetchOrderNumber()).rejects.toThrow(
                'Order number fetch error'
            )
        })

        it('should throw default error message if json parsing fails', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('Parse error'))
            })

            mockApiClient.get.mockResolvedValueOnce(mockFetchPromise)

            await expect(orderNumberService.fetchOrderNumber()).rejects.toThrow(
                'Failed to fetch order number'
            )
        })

        it('should throw error with status code when error message is not available', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 404,
                json: jest.fn().mockResolvedValue({})
            })

            mockApiClient.get.mockResolvedValueOnce(mockFetchPromise)

            await expect(orderNumberService.fetchOrderNumber()).rejects.toThrow(
                'Fetch order number failed with status 404'
            )
        })
    })
})
