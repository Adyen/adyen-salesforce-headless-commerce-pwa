import {AdyenTemporaryBasketService as TemporaryBasketService} from '../temporary-basket'
import {ApiClient} from '../api'

// Mock the API client
jest.mock('../api', () => ({
    ApiClient: jest.fn().mockImplementation(() => ({
        post: jest.fn()
    }))
}))

describe('TemporaryBasketService', () => {
    let temporaryBasketService
    const mockToken = 'test-token'
    const mockCustomerId = 'customer123'
    const mockSite = {id: 'RefArch'}
    const mockBasketResponse = {
        basketId: 'basket123',
        orderTotal: 99.99,
        currency: 'USD'
    }

    beforeEach(() => {
        jest.clearAllMocks()
        temporaryBasketService = new TemporaryBasketService(mockToken, mockCustomerId, mockSite)
    })

    it('should create an instance with the correct base URL', () => {
        // The constructor is called with (baseUrl, token, customerId, basketId, site)
        expect(ApiClient).toHaveBeenCalledWith(
            '/api/adyen/pdp/temporary-baskets',
            mockToken,
            mockCustomerId,
            null,
            mockSite
        )
    })

    describe('createTemporaryBasket', () => {
        it('should create a temporary basket successfully with product', async () => {
            const mockProduct = {id: 'product123', quantity: 2, price: 49.99}
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockBasketResponse)
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            const result = await temporaryBasketService.createTemporaryBasket(mockProduct)

            expect(temporaryBasketService.apiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({product: mockProduct})
            })
            expect(result).toEqual(mockBasketResponse)
        })

        it('should create a temporary basket without product parameter', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockBasketResponse)
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            const result = await temporaryBasketService.createTemporaryBasket()

            expect(temporaryBasketService.apiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({product: undefined})
            })
            expect(result).toEqual(mockBasketResponse)
        })

        it('should handle API errors with error message', async () => {
            const errorResponse = {message: 'Failed to create temporary basket'}
            const mockResponse = {
                status: 400,
                json: jest.fn().mockResolvedValue(errorResponse)
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await expect(temporaryBasketService.createTemporaryBasket()).rejects.toThrow(
                'Failed to create temporary basket'
            )
        })

        it('should handle API errors without error message', async () => {
            const mockResponse = {
                status: 500,
                json: jest.fn().mockResolvedValue({})
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await expect(temporaryBasketService.createTemporaryBasket()).rejects.toThrow(
                'Create temporary basket failed with status 500'
            )
        })

        it('should handle JSON parse errors', async () => {
            const mockResponse = {
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('JSON parse error'))
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await expect(temporaryBasketService.createTemporaryBasket()).rejects.toThrow(
                'Failed to create temporary basket'
            )
        })

        it('should handle network errors', async () => {
            temporaryBasketService.apiClient.post.mockRejectedValue(new Error('Network error'))

            await expect(temporaryBasketService.createTemporaryBasket()).rejects.toThrow(
                'Network error'
            )
        })

        it('should create basket with product containing quantity', async () => {
            const mockProduct = {id: 'product456', quantity: 5, price: 29.99}
            const expectedBasket = {...mockBasketResponse, basketId: 'basket456'}
            const mockResponse = {status: 201, json: jest.fn().mockResolvedValue(expectedBasket)}
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            const result = await temporaryBasketService.createTemporaryBasket(mockProduct)

            expect(temporaryBasketService.apiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({product: mockProduct})
            })
            expect(result).toEqual(expectedBasket)
            expect(result.basketId).toBe('basket456')
        })
    })
})
