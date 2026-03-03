import {PaymentCancelService} from '../payment-cancel'
import {ApiClient} from '../api'

jest.mock('../api')

describe('PaymentCancelService', () => {
    let paymentCancelService
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

        paymentCancelService = new PaymentCancelService(
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
                '/api/adyen/payment',
                mockToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
        })
    })

    describe('paymentCancel', () => {
        const orderNo = '00123456'

        it('should return the JSON response on a successful API call', async () => {
            const mockSuccessPayload = {success: true, message: 'payment cancelled'}
            const mockApiResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSuccessPayload)
            }
            mockPost.mockResolvedValue(mockApiResponse)
            const result = await paymentCancelService.paymentCancel(orderNo)
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
            await expect(paymentCancelService.paymentCancel(orderNo)).rejects.toThrow(Error)
            expect(mockPost).toHaveBeenCalledTimes(1)
        })

        it('should use fallback message when json parsing fails on error response', async () => {
            mockPost.mockResolvedValue({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })
            await expect(paymentCancelService.paymentCancel(orderNo)).rejects.toThrow(
                'Payment cancellation failed'
            )
        })

        it('should use status-based message when no message in error json', async () => {
            mockPost.mockResolvedValue({
                status: 503,
                json: jest.fn().mockResolvedValue({})
            })
            await expect(paymentCancelService.paymentCancel(orderNo)).rejects.toThrow(
                'Payment cancel failed with status 503'
            )
        })

        it('should propagate errors if the apiClient.post call itself rejects', async () => {
            const networkError = new Error('Network request failed')
            mockPost.mockRejectedValue(networkError)

            await expect(paymentCancelService.paymentCancel(orderNo)).rejects.toThrow(
                'Network request failed'
            )
            await expect(paymentCancelService.paymentCancel(orderNo)).rejects.toBe(networkError)
        })
    })

    describe('cancelAbandonedPayment', () => {
        it('should return the JSON response on a successful API call with default reason', async () => {
            const mockSuccessPayload = {success: true}
            mockPost.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue(mockSuccessPayload)
            })

            const result = await paymentCancelService.cancelAbandonedPayment()

            expect(mockPost).toHaveBeenCalledWith({
                path: '/cancel',
                body: JSON.stringify({reason: 'abandoned_session'})
            })
            expect(result).toEqual(mockSuccessPayload)
        })

        it('should use a custom reason when provided', async () => {
            mockPost.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue({success: true})
            })

            await paymentCancelService.cancelAbandonedPayment('user_requested')

            expect(mockPost).toHaveBeenCalledWith({
                path: '/cancel',
                body: JSON.stringify({reason: 'user_requested'})
            })
        })

        it('should throw an error with server message when status >= 300', async () => {
            mockPost.mockResolvedValue({
                status: 400,
                json: jest.fn().mockResolvedValue({message: 'Bad request'})
            })

            await expect(paymentCancelService.cancelAbandonedPayment()).rejects.toThrow(
                'Bad request'
            )
        })

        it('should throw a fallback error when status >= 300 and json parsing fails', async () => {
            mockPost.mockResolvedValue({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })

            await expect(paymentCancelService.cancelAbandonedPayment()).rejects.toThrow(
                'Abandoned payment cancellation failed'
            )
        })

        it('should throw a status-based error when status >= 300 and no message in response', async () => {
            mockPost.mockResolvedValue({
                status: 503,
                json: jest.fn().mockResolvedValue({})
            })

            await expect(paymentCancelService.cancelAbandonedPayment()).rejects.toThrow(
                'Abandoned payment cancel failed with status 503'
            )
        })

        it('should propagate errors if apiClient.post rejects', async () => {
            const networkError = new Error('Network failure')
            mockPost.mockRejectedValue(networkError)

            await expect(paymentCancelService.cancelAbandonedPayment()).rejects.toThrow(
                'Network failure'
            )
        })
    })
})
