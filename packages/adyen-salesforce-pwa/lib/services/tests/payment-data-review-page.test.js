import {AdyenPaymentDataReviewPageService} from '../payment-data-review-page.js'
import {ApiClient} from '../api'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            get: jest.fn(),
            post: jest.fn()
        }))
    }
})

describe('AdyenPaymentDataReviewPageService', () => {
    let adyenService
    const mockToken = 'test-token'
    const mockCustomerId = 'test-customer'
    const mockBasketId = 'test-basket'
    const mockSite = {id: 'RefArch'}

    const mockPaymentData = {
        details: {
            billingToken: null,
            facilitatorAccessToken: '1WP6839J5ZKOIZ57aMZ',
            payerID: '9DNS6DJFHS4NC',
            orderID: '9914810184130050',
            paymentID: '1WPF9J5ZKOIZH8MZ',
            paymentSource: 'paypal'
        },
        paymentData: 'ABC...'
    }

    beforeEach(() => {
        jest.clearAllMocks()
        adyenService = new AdyenPaymentDataReviewPageService(
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    it('should create an instance with the correct properties', () => {
        expect(adyenService.baseUrl).toBe('/api/adyen/payment-data-for-review-page')
        expect(ApiClient).toHaveBeenCalledWith(
            '/api/adyen/payment-data-for-review-page',
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    describe('getPaymentData', () => {
        it('should call apiClient get method and return response', async () => {
            const mockResponse = mockPaymentData
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            const result = await adyenService.getPaymentData()

            expect(adyenService.apiClient.get).toHaveBeenCalledWith()
            expect(result).toEqual(mockResponse)
        })

        it('should return empty object when no payment data exists', async () => {
            const mockResponse = {}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            const result = await adyenService.getPaymentData()

            expect(result).toEqual({})
        })

        it('should throw an error if response status is >= 300', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({message: 'Failed to get payment data'})
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            await expect(adyenService.getPaymentData()).rejects.toThrow(
                'Failed to get payment data'
            )
        })

        it('should throw default error message if json parsing fails', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('Parse error'))
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            await expect(adyenService.getPaymentData()).rejects.toThrow(
                'Failed to get payment data for review page'
            )
        })
    })

    describe('setPaymentData', () => {
        it('should call apiClient post method with correct parameters and return response', async () => {
            const mockResponse = {basketId: mockBasketId}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            adyenService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            const result = await adyenService.setPaymentData(mockPaymentData)

            expect(adyenService.apiClient.post).toHaveBeenCalledWith({
                body: JSON.stringify({paymentData: mockPaymentData})
            })
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if response status is >= 300', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({message: 'Invalid payment data'})
            })

            adyenService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            await expect(adyenService.setPaymentData(mockPaymentData)).rejects.toThrow(
                'Invalid payment data'
            )
        })

        it('should throw default error message if json parsing fails', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('Parse error'))
            })

            adyenService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            await expect(adyenService.setPaymentData(mockPaymentData)).rejects.toThrow(
                'Failed to set payment data for review page'
            )
        })
    })
})
