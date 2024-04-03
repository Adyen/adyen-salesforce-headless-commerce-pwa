import {AdyenShippingMethodsService} from '../shipping-methods'
import {ApiClient} from '../api'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            post: jest.fn()
        }))
    }
})

describe('AdyenShippingMethodsService', () => {
    let adyenService, apiClientMock

    beforeEach(() => {
        apiClientMock = {
            post: jest.fn().mockResolvedValue({})
        }
        ApiClient.mockImplementation(() => apiClientMock)
        adyenService = new AdyenShippingMethodsService('token', 'site')
    })

    it('should create an instance with the correct properties', () => {
        expect(adyenService.baseUrl).toBe('/api/adyen/shipping-methods')
        expect(adyenService.apiClient).toBe(apiClientMock)
    })

    describe('updateShippingMethod', () => {
        it('should call apiClient post method with correct parameters and return response', async () => {
            const shippingMethodId = 'method-id'
            const basketId = 'basket-id'
            const expectedBody = {shippingMethodId}
            const expectedHeaders = {basketid: basketId}
            const mockResponse = {}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            apiClientMock.post.mockResolvedValueOnce(mockFetchPromise)

            const result = await adyenService.updateShippingMethod(shippingMethodId, basketId)

            expect(apiClientMock.post).toHaveBeenCalledWith({
                body: JSON.stringify(expectedBody),
                headers: expectedHeaders
            })
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if response status is >= 300', async () => {
            const mockResponse = {
                status: 400,
                json: jest.fn().mockResolvedValueOnce({
                    /* mock error response */
                })
            }

            apiClientMock.post.mockResolvedValueOnce(mockResponse)
            expect(mockResponse.json).not.toHaveBeenCalled()
        })
    })
})
