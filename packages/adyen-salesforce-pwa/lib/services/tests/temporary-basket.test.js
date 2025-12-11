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
})
