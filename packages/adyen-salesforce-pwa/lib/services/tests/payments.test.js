import {AdyenPaymentsService} from '../payments'
import {ApiClient} from '../api'
import {CUSTOMER_ID_MOCK} from '../../../__mocks__/adyenApi/constants'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            post: jest.fn()
        }))
    }
})

describe('AdyenPaymentsService', () => {
    let paymentsService
    let mockToken = 'mockToken'
    let mockSite = {id: 'RefArch'}
    let mockAdyenStateData = {someData: 'mockData'}
    let mockBasketId = 'mockBasketId'
    let mockCustomerId = CUSTOMER_ID_MOCK

    beforeEach(() => {
        paymentsService = new AdyenPaymentsService(mockToken, mockSite)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should create an instance of AdyenPaymentsService with ApiClient', () => {
        expect(paymentsService).toBeInstanceOf(AdyenPaymentsService)
        expect(ApiClient).toHaveBeenCalledWith('/api/adyen/payments', mockToken, mockSite)
    })

    it('should submit payment successfully', async () => {
        const mockResponse = {paymentResult: 'success'}
        const mockJsonPromise = Promise.resolve(mockResponse)
        const mockFetchPromise = Promise.resolve({
            json: () => mockJsonPromise,
            status: 200
        })

        paymentsService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

        const paymentResult = await paymentsService.submitPayment(
            mockAdyenStateData,
            mockBasketId,
            mockCustomerId
        )

        expect(paymentsService.apiClient.post).toHaveBeenCalledWith({
            body: JSON.stringify({data: mockAdyenStateData}),
            headers: {
                customerid: mockCustomerId,
                basketid: mockBasketId
            }
        })
        expect(paymentResult).toEqual(mockResponse)
    })

    it('should throw an error when submitPayment gets a status >= 300', async () => {
        const mockFetchPromise = Promise.resolve({
            status: 400,
            statusText: 'Bad Request'
        })

        paymentsService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

        await expect(
            paymentsService.submitPayment(mockAdyenStateData, mockBasketId, mockCustomerId)
        ).rejects.toThrow('[object Object]')
    })
})
