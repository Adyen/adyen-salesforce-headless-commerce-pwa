import {AdyenDonationsService} from '../donations'
import {ApiClient} from '../api'

// Mock the ApiClient
jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => {
            return {
                get: jest.fn(),
                post: jest.fn()
            }
        })
    }
})

describe('AdyenDonationsService', () => {
    const mockToken = 'mockToken'
    const mockCustomerId = 'mockCustomerId'
    const mockSite = {id: 'RefArch'}
    let donationsService

    beforeEach(() => {
        ApiClient.mockClear()
        donationsService = new AdyenDonationsService(mockToken, mockCustomerId, null, mockSite)
    })

    describe('constructor', () => {
        it('should create an instance of ApiClient with the correct parameters', () => {
            expect(ApiClient).toHaveBeenCalledWith(
                '/api/adyen',
                mockToken,
                mockCustomerId,
                null,
                mockSite
            )
        })
    })

    describe('fetchDonationCampaigns', () => {
        const mockOrderNo = '00001234'
        const mockLocale = {id: 'en-US'}

        it('should call apiClient.get with the correct parameters', async () => {
            donationsService.apiClient.get.mockResolvedValue({
                status: 200,
                json: () => Promise.resolve({})
            })
            await donationsService.fetchDonationCampaigns(mockOrderNo, mockLocale)

            expect(donationsService.apiClient.get).toHaveBeenCalledWith({
                path: '/donationCampaigns',
                queryParams: {locale: mockLocale.id},
                headers: {orderno: mockOrderNo}
            })
        })

        it('should return the JSON response on success', async () => {
            const mockResponse = {campaigns: [{id: '1', name: 'Test Campaign'}]}
            donationsService.apiClient.get.mockResolvedValue({
                status: 200,
                json: () => Promise.resolve(mockResponse)
            })
            const result = await donationsService.fetchDonationCampaigns(mockOrderNo, mockLocale)
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if the response status is >= 300', async () => {
            const mockErrorResponse = {message: 'An error occurred'}
            donationsService.apiClient.get.mockResolvedValue({
                status: 400,
                json: () => Promise.resolve(mockErrorResponse)
            })

            await expect(
                donationsService.fetchDonationCampaigns(mockOrderNo, mockLocale)
            ).rejects.toThrow(mockErrorResponse.message)
        })

        it('should throw fallback error when json parsing fails on error response', async () => {
            donationsService.apiClient.get.mockResolvedValue({
                status: 500,
                json: () => Promise.reject(new Error('parse error'))
            })

            await expect(
                donationsService.fetchDonationCampaigns(mockOrderNo, mockLocale)
            ).rejects.toThrow('Failed to fetch donation campaigns')
        })
    })

    describe('submitDonation', () => {
        const mockDonationData = {
            orderNo: '00001234',
            donationAmount: {currency: 'USD', value: 1000},
            donationCampaignId: 'campaign1'
        }

        it('should call apiClient.post with the correct parameters', async () => {
            donationsService.apiClient.post.mockResolvedValue({
                status: 200,
                json: () => Promise.resolve({})
            })
            await donationsService.submitDonation(mockDonationData)

            expect(donationsService.apiClient.post).toHaveBeenCalledWith({
                path: '/donations',
                body: JSON.stringify({data: mockDonationData}),
                headers: {orderno: mockDonationData.orderNo}
            })
        })

        it('should return the JSON response on success', async () => {
            const mockResponse = {status: 'completed'}
            donationsService.apiClient.post.mockResolvedValue({
                status: 200,
                json: () => Promise.resolve(mockResponse)
            })
            const result = await donationsService.submitDonation(mockDonationData)
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if the response status is >= 300', async () => {
            const mockErrorResponse = {message: 'Donation failed'}
            donationsService.apiClient.post.mockResolvedValue({
                status: 500,
                json: () => Promise.resolve(mockErrorResponse)
            })

            await expect(donationsService.submitDonation(mockDonationData)).rejects.toThrow(
                mockErrorResponse.message
            )
        })

        it('should throw fallback error when json parsing fails on error response', async () => {
            donationsService.apiClient.post.mockResolvedValue({
                status: 500,
                json: () => Promise.reject(new Error('parse error'))
            })

            await expect(donationsService.submitDonation(mockDonationData)).rejects.toThrow(
                'Donation submission failed'
            )
        })
    })
})
