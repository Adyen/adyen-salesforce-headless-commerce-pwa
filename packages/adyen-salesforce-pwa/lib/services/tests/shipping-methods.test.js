import {AdyenShippingMethodsService} from '../shipping-methods.js'
import {ApiClient} from '../api'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            get: jest.fn(),
            post: jest.fn()
        }))
    }
})

describe('AdyenShippingMethodsService', () => {
    let adyenService
    const mockToken = 'test-token'
    const mockCustomerId = 'test-customer'
    const mockBasketId = 'test-basket'
    const mockSite = {id: 'RefArch'}

    beforeEach(() => {
        jest.clearAllMocks()
        adyenService = new AdyenShippingMethodsService(
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    it('should create an instance with the correct properties', () => {
        expect(adyenService.baseUrl).toBe('/api/adyen/shipping-methods')
        expect(ApiClient).toHaveBeenCalledWith(
            '/api/adyen/shipping-methods',
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    describe('getShippingMethods', () => {
        it('should call apiClient get method with correct parameters and return response', async () => {
            const mockResponse = {}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            const result = await adyenService.getShippingMethods()

            expect(adyenService.apiClient.get).toHaveBeenCalledWith()
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if response status is >= 300', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({message: 'Get shipping methods failed'})
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            await expect(adyenService.getShippingMethods()).rejects.toThrow(
                'Get shipping methods failed'
            )
        })
    })

    describe('updateShippingMethod', () => {
        it('should call apiClient post method with correct parameters and return response', async () => {
            const shippingMethodId = 'method-id'
            const expectedBody = {shippingMethodId}
            const mockResponse = {}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            adyenService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            const result = await adyenService.updateShippingMethod(shippingMethodId)

            expect(adyenService.apiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify(expectedBody)
            })
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if response status is >= 300', async () => {
            const shippingMethodId = 'method-id'
            const mockFetchPromise = Promise.resolve({
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({message: 'Update shipping method error'})
            })

            adyenService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            await expect(adyenService.updateShippingMethod(shippingMethodId)).rejects.toThrow(
                'Update shipping method error'
            )
        })
    })
})
