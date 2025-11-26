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
    const mockBasketId = 'basket123'
    const mockSite = {id: 'RefArch'}
    const mockBasketResponse = {
        basketId: 'basket123',
        orderTotal: 99.99,
        currency: 'USD'
    }

    beforeEach(() => {
        jest.clearAllMocks()
        temporaryBasketService = new TemporaryBasketService(
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    it('should create an instance with the correct base URL', () => {
        // The constructor is called with (baseUrl, token, customerId, siteId, basketId)
        // The actual implementation passes null for siteId
        expect(ApiClient).toHaveBeenCalledWith(
            '/api/adyen/pdp/temporary-baskets',
            mockToken,
            mockCustomerId,
            null, // siteId is null in the actual implementation
            mockBasketId
        )
    })

    describe('createTemporaryBasket', () => {
        it('should create a temporary basket successfully', async () => {
            const mockResponse = {ok: true, json: jest.fn().mockResolvedValue(mockBasketResponse)}
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            const result = await temporaryBasketService.createTemporaryBasket()

            expect(temporaryBasketService.apiClient.post).toHaveBeenCalledWith()
            expect(result).toEqual(mockBasketResponse)
        })

        it('should handle API errors', async () => {
            const errorResponse = {message: 'Failed to create temporary basket'}
            const mockResponse = {
                ok: false,
                status: 400,
                json: jest.fn().mockResolvedValue(errorResponse)
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await expect(temporaryBasketService.createTemporaryBasket()).rejects.toThrow(
                'Failed to create temporary basket'
            )
        })

        it('should handle JSON parse errors', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('JSON parse error'))
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await expect(temporaryBasketService.createTemporaryBasket()).rejects.toThrow(
                'Failed to create temporary basket'
            )
        })
    })

    describe('addProductToBasket', () => {
        const basketId = 'basket123'
        const productId = 'product123'
        const quantity = 2
        const mockBasketResponse = {
            basketId,
            items: [{productId, quantity, price: 49.99}],
            orderTotal: 99.98,
            currency: 'USD'
        }

        it('should add a product to the basket successfully', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue(mockBasketResponse)
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            const result = await temporaryBasketService.addProductToBasket(
                basketId,
                productId,
                quantity
            )

            expect(temporaryBasketService.apiClient.post).toHaveBeenCalledWith(
                `/${basketId}/items`,
                {productId, quantity}
            )
            expect(result).toEqual(mockBasketResponse)
        })

        it('should use default quantity of 1 if not provided', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue(mockBasketResponse)
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await temporaryBasketService.addProductToBasket(basketId, productId)

            expect(temporaryBasketService.apiClient.post).toHaveBeenCalledWith(
                `/${basketId}/items`,
                {productId, quantity: 1}
            )
        })

        it('should throw error when basketId is missing', async () => {
            await expect(
                temporaryBasketService.addProductToBasket(null, productId)
            ).rejects.toThrow('Basket ID and Product ID are required')
        })

        it('should throw error when productId is missing', async () => {
            await expect(temporaryBasketService.addProductToBasket(basketId, null)).rejects.toThrow(
                'Basket ID and Product ID are required'
            )
        })

        it('should throw error when quantity is less than 1', async () => {
            await expect(
                temporaryBasketService.addProductToBasket(basketId, productId, 0)
            ).rejects.toThrow('Quantity must be at least 1')
        })

        it('should handle API errors', async () => {
            const errorResponse = {message: 'Product not found'}
            const mockResponse = {
                ok: false,
                status: 404,
                json: jest.fn().mockResolvedValue(errorResponse)
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await expect(
                temporaryBasketService.addProductToBasket(basketId, 'invalid-product')
            ).rejects.toThrow('Product not found')
        })

        it('should handle JSON parse errors', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('JSON parse error'))
            }
            temporaryBasketService.apiClient.post.mockResolvedValueOnce(mockResponse)

            await expect(
                temporaryBasketService.addProductToBasket(basketId, productId)
            ).rejects.toThrow('Failed to add product to basket')
        })
    })
})
