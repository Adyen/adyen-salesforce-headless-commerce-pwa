import {AdyenPaypalUpdateOrderService} from '../paypal-update-order'
import {ApiClient} from '../api'

jest.mock('../api')

describe('AdyenPaypalUpdateOrderService', () => {
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

        service = new AdyenPaypalUpdateOrderService(
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
        it('should initialize with correct baseUrl', () => {
            expect(service.baseUrl).toBe('/api/adyen/paypal-update-order')
        })

        it('should create ApiClient with correct parameters', () => {
            expect(ApiClient).toHaveBeenCalledWith(
                '/api/adyen/paypal-update-order',
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

    describe('updatePaypalOrder', () => {
        const mockPaymentData = {
            paymentData: 'test-payment-data',
            pspReference: 'PSP123'
        }

        it('should successfully update paypal order', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({
                    paymentData: 'updated-payment-data',
                    status: 'success'
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            const result = await service.updatePaypalOrder(mockPaymentData)

            expect(mockApiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({
                    data: mockPaymentData
                })
            })
            expect(result).toEqual({
                paymentData: 'updated-payment-data',
                status: 'success'
            })
        })

        it('should throw error when response status is 300 or higher', async () => {
            const mockResponse = {
                status: 400,
                json: jest.fn().mockResolvedValue({
                    message: 'Bad Request'
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updatePaypalOrder(mockPaymentData)).rejects.toThrow('Bad Request')
        })

        it('should throw error with status code when error message is not available', async () => {
            const mockResponse = {
                status: 500,
                json: jest.fn().mockResolvedValue({})
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updatePaypalOrder(mockPaymentData)).rejects.toThrow(
                'Update paypal order failed with status 500'
            )
        })

        it('should handle JSON parse error and throw default error message', async () => {
            const mockResponse = {
                status: 400,
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await expect(service.updatePaypalOrder(mockPaymentData)).rejects.toThrow(
                'Failed to update paypal order'
            )
        })

        it('should handle 201 status as success', async () => {
            const mockResponse = {
                status: 201,
                json: jest.fn().mockResolvedValue({
                    paymentData: 'created-payment-data'
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            const result = await service.updatePaypalOrder(mockPaymentData)

            expect(result).toEqual({
                paymentData: 'created-payment-data'
            })
        })

        it('should handle 299 status as success', async () => {
            const mockResponse = {
                status: 299,
                json: jest.fn().mockResolvedValue({
                    paymentData: 'success-payment-data'
                })
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            const result = await service.updatePaypalOrder(mockPaymentData)

            expect(result).toEqual({
                paymentData: 'success-payment-data'
            })
        })

        it('should properly stringify data in request body', async () => {
            const complexData = {
                paymentData: 'test',
                nested: {
                    field: 'value'
                },
                array: [1, 2, 3]
            }
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({success: true})
            }
            mockApiClient.post.mockResolvedValue(mockResponse)

            await service.updatePaypalOrder(complexData)

            expect(mockApiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({
                    data: complexData
                })
            })
        })
    })
})
