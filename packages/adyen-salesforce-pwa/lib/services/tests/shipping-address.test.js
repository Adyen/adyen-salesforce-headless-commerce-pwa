import {AdyenShippingAddressService} from '../shipping-address'
import {ApiClient} from '../api'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            post: jest.fn()
        }))
    }
})

describe('AdyenShippingAddressService', () => {
    let adyenService, apiClientMock

    beforeEach(() => {
        apiClientMock = {
            post: jest.fn().mockResolvedValue({})
        }
        ApiClient.mockImplementation(() => apiClientMock)
        adyenService = new AdyenShippingAddressService('token', 'site')
    })

    it('should create an instance with the correct properties', () => {
        expect(adyenService.baseUrl).toBe('/api/adyen/shipping-address')
        expect(adyenService.apiClient).toBe(apiClientMock)
    })

    describe('updateShippingAddress', () => {
        it('should call apiClient post method with correct parameters and return response', async () => {
            const basketId = 'basket-id'
            const expectedBody = {
                data: {
                    deliveryAddress: {
                        city: 'Amsterdam',
                        country: 'NL',
                        houseNumberOrName: '',
                        postalCode: '1000AA',
                        stateOrProvince: '',
                        street: 'SC'
                    },
                    profile: {
                        firstName: 'Test',
                        lastName: 'Test',
                        email: 'test@test.com',
                        phone: '9234567890'
                    }
                }
            }
            const mockResponse = {}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            apiClientMock.post.mockResolvedValueOnce(mockFetchPromise)

            const result = await adyenService.updateShippingAddress(basketId, expectedBody)
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if response status is >= 300', async () => {
            const mockResponse = {
                status: 400,
                json: jest.fn().mockResolvedValueOnce({
                })
            }

            apiClientMock.post.mockResolvedValueOnce(mockResponse)
            expect(mockResponse.json).not.toHaveBeenCalled()
        })
    })
})
