import {AdyenShopperDetailsService} from '../shopper-details'
import {ApiClient} from '../api'

jest.mock('../api')

describe('AdyenShopperDetailsService', () => {
    let service
    let mockApiClient
    const mockToken = 'test-token'
    const mockCustomerId = 'customer123'
    const mockBasketId = 'basket456'
    const mockSite = {id: 'site-id'}

    beforeEach(() => {
        mockApiClient = {
            post: jest.fn()
        }
        ApiClient.mockImplementation(() => mockApiClient)

        service = new AdyenShopperDetailsService(mockToken, mockCustomerId, mockBasketId, mockSite)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('constructor', () => {
        it('should initialize with correct baseUrl', () => {
            expect(service.baseUrl).toBe('/api/adyen/shopper-details')
        })

        it('should create ApiClient with correct parameters', () => {
            expect(ApiClient).toHaveBeenCalledWith(
                '/api/adyen/shopper-details',
                mockToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
        })

        it('should set apiClient instance', () => {
            expect(service.apiClient).toBe(mockApiClient)
        })
    })

    describe('updateShopperDetails', () => {
        const mockShopperData = {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890'
        }

        it('should successfully update shopper details', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({
                    basketId: 'basket456',
                    customerInfo: {
                        email: 'test@example.com',
                        customerId: 'customer123'
                    }
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            const result = await service.updateShopperDetails(mockShopperData)

            expect(mockApiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({
                    data: mockShopperData
                })
            })
            expect(result).toEqual({
                basketId: 'basket456',
                customerInfo: {
                    email: 'test@example.com',
                    customerId: 'customer123'
                }
            })
        })

        it('should handle 201 status as success', async () => {
            const mockResponse = {
                status: 201,
                json: jest.fn().mockResolvedValue({
                    success: true
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            const result = await service.updateShopperDetails(mockShopperData)

            expect(result).toEqual({success: true})
        })

        it('should handle 299 status as success', async () => {
            const mockResponse = {
                status: 299,
                json: jest.fn().mockResolvedValue({
                    success: true
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            const result = await service.updateShopperDetails(mockShopperData)

            expect(result).toEqual({success: true})
        })

        it('should throw error when response status is 300', async () => {
            const mockResponse = {
                status: 300,
                json: jest.fn().mockResolvedValue({
                    message: 'Multiple Choices'
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updateShopperDetails(mockShopperData)).rejects.toThrow(
                'Multiple Choices'
            )
        })

        it('should throw error when response status is 400', async () => {
            const mockResponse = {
                status: 400,
                json: jest.fn().mockResolvedValue({
                    message: 'Bad Request'
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updateShopperDetails(mockShopperData)).rejects.toThrow(
                'Bad Request'
            )
        })

        it('should throw error when response status is 500', async () => {
            const mockResponse = {
                status: 500,
                json: jest.fn().mockResolvedValue({
                    message: 'Internal Server Error'
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updateShopperDetails(mockShopperData)).rejects.toThrow(
                'Internal Server Error'
            )
        })

        it('should throw error with status code when error message is not available', async () => {
            const mockResponse = {
                status: 404,
                json: jest.fn().mockResolvedValue({})
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updateShopperDetails(mockShopperData)).rejects.toThrow(
                'Update shopper details failed with status 404'
            )
        })

        it('should handle JSON parse error and throw default error message', async () => {
            const mockResponse = {
                status: 400,
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updateShopperDetails(mockShopperData)).rejects.toThrow(
                'Failed to update shopper details'
            )
        })

        it('should properly stringify complex data in request body', async () => {
            const complexData = {
                email: 'test@example.com',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    postalCode: '10001'
                },
                preferences: ['email', 'sms'],
                metadata: {
                    source: 'web',
                    timestamp: '2023-01-01T00:00:00Z'
                }
            }
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({success: true})
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await service.updateShopperDetails(complexData)

            expect(mockApiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({
                    data: complexData
                })
            })
        })

        it('should handle empty data object', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({success: true})
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await service.updateShopperDetails({})

            expect(mockApiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({
                    data: {}
                })
            })
        })

        it('should handle null values in data', async () => {
            const dataWithNull = {
                email: 'test@example.com',
                phone: null,
                address: null
            }
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({success: true})
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await service.updateShopperDetails(dataWithNull)

            expect(mockApiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({
                    data: dataWithNull
                })
            })
        })
    })
})
