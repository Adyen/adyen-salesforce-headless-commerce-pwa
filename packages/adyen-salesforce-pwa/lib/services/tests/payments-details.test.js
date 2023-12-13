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

    beforeEach(() => {
        paymentsDetailsService = new AdyenPaymentsDetailsService(mockToken)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should create an instance of AdyenPaymentsDetailsService with ApiClient', () => {
        expect(paymentsDetailsService).toBeInstanceOf(AdyenPaymentsDetailsService)
        expect(ApiClient).toHaveBeenCalledWith('/api/adyen/payments/details', mockToken)
    })

    it('should submit payment details successfully', async () => {
        const mockResponse = {paymentDetailsResult: 'success'}
        const mockJsonPromise = Promise.resolve(mockResponse)
        const mockFetchPromise = Promise.resolve({
            json: () => mockJsonPromise,
            status: 200
        })

        paymentsDetailsService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

        const paymentDetailsResult = await paymentsDetailsService.submitPaymentsDetails(
            mockData,
            mockCustomerId
        )

        expect(paymentsDetailsService.apiClient.post).toHaveBeenCalledWith({
            body: JSON.stringify({data: mockData}),
            headers: {
                customerid: mockCustomerId
            }
        })
        expect(paymentDetailsResult).toEqual(mockResponse)
    })

    it('should throw an error when submitPaymentsDetails gets a status >= 300', async () => {
        const mockFetchPromise = Promise.resolve({
            status: 400,
            statusText: 'Bad Request'
        })

        paymentsDetailsService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

        await expect(
            paymentsDetailsService.submitPaymentsDetails(mockData, mockCustomerId)
        ).rejects.toThrow('[object Object]')
    })
})
