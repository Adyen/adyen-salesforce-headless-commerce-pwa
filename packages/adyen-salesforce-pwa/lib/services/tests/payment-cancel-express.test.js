import {PaymentCancelExpressService} from '../payment-cancel-express'
import {ApiClient} from '../api'

jest.mock('../api')

describe('PaymentCancelExpressService', () => {
    let service
    let mockPost
    const mockToken = 'test-auth-token'
    const mockCustomerId = 'customer-abc-123'
    const mockBasketId = 'basket-xyz-789'
    const mockSite = {id: 'test-site-id'}

    beforeEach(() => {
        jest.clearAllMocks()
        mockPost = jest.fn()
        ApiClient.mockImplementation(() => ({
            post: mockPost
        }))
        service = new PaymentCancelExpressService(mockToken, mockCustomerId, mockBasketId, mockSite)
    })

    describe('constructor', () => {
        it('should create an ApiClient with the correct base URL and credentials', () => {
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

    describe('paymentCancelExpress', () => {
        it('should return the JSON response on a successful API call', async () => {
            const mockPayload = {success: true}
            mockPost.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue(mockPayload)
            })

            const result = await service.paymentCancelExpress()

            expect(mockPost).toHaveBeenCalledWith({
                path: '/cancel/express',
                body: JSON.stringify({})
            })
            expect(result).toEqual(mockPayload)
        })

        it('should throw an error with server message when status >= 300', async () => {
            mockPost.mockResolvedValue({
                status: 400,
                json: jest.fn().mockResolvedValue({errorMessage: 'Cancellation denied'})
            })

            await expect(service.paymentCancelExpress()).rejects.toThrow('Cancellation denied')
        })

        it('should throw a fallback error when status >= 300 and json parsing fails', async () => {
            mockPost.mockResolvedValue({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })

            await expect(service.paymentCancelExpress()).rejects.toThrow(
                'Express payment cancellation failed'
            )
        })

        it('should throw a status-based error when status >= 300 and no message in response', async () => {
            mockPost.mockResolvedValue({
                status: 503,
                json: jest.fn().mockResolvedValue({})
            })

            await expect(service.paymentCancelExpress()).rejects.toThrow(
                'Express payment cancel failed with status 503'
            )
        })

        it('should propagate errors if apiClient.post rejects', async () => {
            const networkError = new Error('Network failure')
            mockPost.mockRejectedValue(networkError)

            await expect(service.paymentCancelExpress()).rejects.toThrow('Network failure')
        })
    })
})
