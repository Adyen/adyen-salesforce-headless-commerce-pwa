import {AdyenOrderService} from '../order'
import {ApiClient} from '../api'

jest.mock('../api')

describe('AdyenOrderService', () => {
    let orderService
    let mockPost
    const mockToken = 'test-auth-token'
    const mockCustomerId = 'customer-abc-123'
    const mockBasketId = 'basket-xyz-789'
    const mockSite = {id: 'test-site-id'}

    beforeEach(() => {
        jest.clearAllMocks()
        mockPost = jest.fn()
        ApiClient.mockImplementation(() => {
            return {
                post: mockPost
            }
        })

        orderService = new AdyenOrderService(
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    describe('constructor', () => {
        it('should create an instance of ApiClient with the correct base URL and credentials', () => {
            expect(ApiClient).toHaveBeenCalledTimes(1)
            expect(ApiClient).toHaveBeenCalledWith(
                '/api/adyen/order',
                mockToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
        })
    })

    describe('orderCancel', () => {
        const orderNo = '00123456'

        it('should return the JSON response on a successful API call', async () => {
            const mockSuccessPayload = {success: true, message: 'Order cancelled'}
            const mockApiResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSuccessPayload)
            }
            mockPost.mockResolvedValue(mockApiResponse)
            const result = await orderService.orderCancel(orderNo)
            expect(mockPost).toHaveBeenCalledTimes(1)
            expect(mockPost).toHaveBeenCalledWith({
                path: '/cancel',
                body: JSON.stringify({orderNo})
            })
            expect(result).toEqual(mockSuccessPayload)
        })

        it('should throw an error on a failed API call (status >= 300)', async () => {
            const mockErrorResponse = {
                status: 404,
                statusText: 'Not Found'
            }
            mockPost.mockResolvedValue(mockErrorResponse)
            await expect(orderService.orderCancel(orderNo)).rejects.toThrow(Error)
            expect(mockPost).toHaveBeenCalledTimes(1)
        })

        it('should propagate errors if the apiClient.post call itself rejects', async () => {
            const networkError = new Error('Network request failed')
            mockPost.mockRejectedValue(networkError)

            await expect(orderService.orderCancel(orderNo)).rejects.toThrow(
                'Network request failed'
            )
            await expect(orderService.orderCancel(orderNo)).rejects.toBe(networkError)
        })
    })
})