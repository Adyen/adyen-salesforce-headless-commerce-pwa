import {AdyenPaymentsDetailsService} from '../payments-details'
import {ApiClient} from '../api'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            post: jest.fn()
        }))
    }
})

describe('AdyenPaymentsDetailsService', () => {
    let paymentsDetailsService
    let mockToken = 'mockTokenHere'
    let mockData = {someData: 'mockData'}
    let mockCustomerId = 'mockCustomerId'
    let mockBasketId = 'mockBasketId'
    let mockSite = {id: 'RefArch'}

    beforeEach(() => {
        paymentsDetailsService = new AdyenPaymentsDetailsService(
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should create an instance of AdyenPaymentsDetailsService with ApiClient', () => {
        expect(paymentsDetailsService).toBeInstanceOf(AdyenPaymentsDetailsService)
        expect(ApiClient).toHaveBeenCalledWith(
            '/api/adyen/payments/details',
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    it('should submit payment details successfully', async () => {
        const mockResponse = {paymentDetailsResult: 'success'}
        const mockJsonPromise = Promise.resolve(mockResponse)
        const mockFetchPromise = Promise.resolve({
            json: () => mockJsonPromise,
            status: 200
        })

        paymentsDetailsService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

        const paymentDetailsResult = await paymentsDetailsService.submitPaymentsDetails(mockData)

        expect(paymentsDetailsService.apiClient.post).toHaveBeenCalledWith({
            body: JSON.stringify({data: mockData})
        })
        expect(paymentDetailsResult).toEqual(mockResponse)
    })

    it('should throw an error when submitPaymentsDetails gets a status >= 300', async () => {
        const mockFetchPromise = Promise.resolve({
            status: 400,
            statusText: 'Bad Request',
            json: jest.fn().mockResolvedValue({errorMessage: 'Payment details error'})
        })

        paymentsDetailsService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

        await expect(paymentsDetailsService.submitPaymentsDetails(mockData)).rejects.toThrow(
            'Payment details error'
        )
    })

    it('should use status-based message when error json has no message', async () => {
        paymentsDetailsService.apiClient.post.mockResolvedValueOnce(
            Promise.resolve({
                status: 503,
                json: jest.fn().mockResolvedValue({})
            })
        )
        await expect(paymentsDetailsService.submitPaymentsDetails(mockData)).rejects.toThrow(
            'Payment details failed with status 503'
        )
    })

    it('should use fallback message when json parsing fails on error', async () => {
        paymentsDetailsService.apiClient.post.mockResolvedValueOnce(
            Promise.resolve({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })
        )
        await expect(paymentsDetailsService.submitPaymentsDetails(mockData)).rejects.toThrow(
            'Payment details submission failed'
        )
    })
})
