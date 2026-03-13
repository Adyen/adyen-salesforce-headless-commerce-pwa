import {AdyenPaymentMethodsForExpressService} from '../payment-methods-for-express'
import {ApiClient} from '../api'

jest.mock('../api')

describe('AdyenPaymentMethodsForExpressService', () => {
    let service
    let mockGet
    const mockToken = 'test-auth-token'
    const mockCustomerId = 'customer-abc-123'
    const mockSite = {id: 'test-site-id'}

    beforeEach(() => {
        jest.clearAllMocks()
        mockGet = jest.fn()
        ApiClient.mockImplementation(() => ({
            get: mockGet
        }))
        service = new AdyenPaymentMethodsForExpressService(mockToken, mockCustomerId, mockSite)
    })

    describe('constructor', () => {
        it('should create an ApiClient with the correct base URL and credentials', () => {
            expect(ApiClient).toHaveBeenCalledTimes(1)
            expect(ApiClient).toHaveBeenCalledWith(
                '/api/adyen/paymentMethodsForExpress',
                mockToken,
                mockCustomerId,
                null,
                mockSite
            )
        })
    })

    describe('fetchPaymentMethodsForExpress', () => {
        const mockLocale = {id: 'en-US'}
        const mockCurrency = 'USD'

        it('should return the JSON response on a successful API call', async () => {
            const mockPayload = {paymentMethods: [{type: 'applepay'}]}
            mockGet.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue(mockPayload)
            })

            const result = await service.fetchPaymentMethodsForExpress(mockLocale, mockCurrency)

            expect(mockGet).toHaveBeenCalledWith({
                queryParams: {locale: 'en-US', currency: 'USD'}
            })
            expect(result).toEqual(mockPayload)
        })

        it('should throw an error with server message when status >= 300', async () => {
            mockGet.mockResolvedValue({
                status: 400,
                json: jest.fn().mockResolvedValue({errorMessage: 'Bad request from server'})
            })

            await expect(
                service.fetchPaymentMethodsForExpress(mockLocale, mockCurrency)
            ).rejects.toThrow('Bad request from server')
        })

        it('should throw a fallback error when status >= 300 and json parsing fails', async () => {
            mockGet.mockResolvedValue({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })

            await expect(
                service.fetchPaymentMethodsForExpress(mockLocale, mockCurrency)
            ).rejects.toThrow('Failed to fetch payment methods for express')
        })

        it('should throw a status-based error when status >= 300 and no message in response', async () => {
            mockGet.mockResolvedValue({
                status: 404,
                json: jest.fn().mockResolvedValue({})
            })

            await expect(
                service.fetchPaymentMethodsForExpress(mockLocale, mockCurrency)
            ).rejects.toThrow('Fetch payment methods for express failed with status 404')
        })

        it('should propagate errors if apiClient.get rejects', async () => {
            const networkError = new Error('Network failure')
            mockGet.mockRejectedValue(networkError)

            await expect(
                service.fetchPaymentMethodsForExpress(mockLocale, mockCurrency)
            ).rejects.toThrow('Network failure')
        })
    })
})
