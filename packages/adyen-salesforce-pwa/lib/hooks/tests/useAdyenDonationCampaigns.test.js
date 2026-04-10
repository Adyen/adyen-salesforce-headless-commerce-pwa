/**
 * @jest-environment jsdom
 */
import {renderHook, waitFor} from '@testing-library/react'
import useAdyenDonationCampaigns from '../useAdyenDonationCampaigns'
import {AdyenDonationsService} from '../../services/donations'

jest.mock('../../services/donations')

describe('useAdyenDonationCampaigns', () => {
    const mockAuthToken = 'test-auth-token'
    const mockCustomerId = 'test-customer-id'
    const mockSite = {id: 'test-site'}
    const mockLocale = {id: 'en-US'}
    const mockOrderNo = '00001234'
    const mockCampaignsData = {
        campaigns: [
            {id: 'campaign1', name: 'Test Campaign 1'},
            {id: 'campaign2', name: 'Test Campaign 2'}
        ],
        orderTotal: 100.0
    }

    let mockFetchDonationCampaigns

    beforeEach(() => {
        jest.clearAllMocks()
        mockFetchDonationCampaigns = jest.fn().mockResolvedValue(mockCampaignsData)
        AdyenDonationsService.mockImplementation(() => ({
            fetchDonationCampaigns: mockFetchDonationCampaigns
        }))
    })

    it('should not fetch when skip is true', async () => {
        renderHook(() =>
            useAdyenDonationCampaigns({
                authToken: mockAuthToken,
                customerId: mockCustomerId,
                site: mockSite,
                locale: mockLocale,
                orderNo: mockOrderNo,
                skip: true
            })
        )

        expect(mockFetchDonationCampaigns).not.toHaveBeenCalled()
    })

    it('should not fetch when authToken is missing', async () => {
        renderHook(() =>
            useAdyenDonationCampaigns({
                authToken: null,
                customerId: mockCustomerId,
                site: mockSite,
                locale: mockLocale,
                orderNo: mockOrderNo
            })
        )

        expect(mockFetchDonationCampaigns).not.toHaveBeenCalled()
    })

    it('should not fetch when orderNo is missing', async () => {
        renderHook(() =>
            useAdyenDonationCampaigns({
                authToken: mockAuthToken,
                customerId: mockCustomerId,
                site: mockSite,
                locale: mockLocale,
                orderNo: null
            })
        )

        expect(mockFetchDonationCampaigns).not.toHaveBeenCalled()
    })

    it('should fetch campaigns successfully', async () => {
        const {result} = renderHook(() =>
            useAdyenDonationCampaigns({
                authToken: mockAuthToken,
                customerId: mockCustomerId,
                site: mockSite,
                locale: mockLocale,
                orderNo: mockOrderNo
            })
        )

        // Initially loading
        expect(result.current.isLoading).toBe(true)
        expect(result.current.data).toBeNull()
        expect(result.current.error).toBeNull()

        // Wait for the fetch to complete
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        // Verify the service was called with correct params
        expect(AdyenDonationsService).toHaveBeenCalledWith(
            mockAuthToken,
            mockCustomerId,
            null,
            mockSite
        )
        expect(mockFetchDonationCampaigns).toHaveBeenCalledWith(mockOrderNo, mockLocale)

        // Verify the result
        expect(result.current.data).toEqual(mockCampaignsData)
        expect(result.current.error).toBeNull()
    })

    it('should handle fetch error', async () => {
        const mockError = new Error('Failed to fetch campaigns')
        mockFetchDonationCampaigns.mockRejectedValue(mockError)

        const {result} = renderHook(() =>
            useAdyenDonationCampaigns({
                authToken: mockAuthToken,
                customerId: mockCustomerId,
                site: mockSite,
                locale: mockLocale,
                orderNo: mockOrderNo
            })
        )

        // Wait for the error state
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        expect(result.current.data).toBeNull()
        expect(result.current.error).toEqual(mockError)
    })

    it('should set isLoading to false when skip is true', () => {
        const {result} = renderHook(() =>
            useAdyenDonationCampaigns({
                authToken: mockAuthToken,
                customerId: mockCustomerId,
                site: mockSite,
                locale: mockLocale,
                orderNo: mockOrderNo,
                skip: true
            })
        )

        expect(result.current.isLoading).toBe(false)
    })

    it('should re-fetch when orderNo changes', async () => {
        const {rerender} = renderHook(
            ({orderNo}) =>
                useAdyenDonationCampaigns({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    site: mockSite,
                    locale: mockLocale,
                    orderNo
                }),
            {initialProps: {orderNo: mockOrderNo}}
        )

        await waitFor(() => expect(mockFetchDonationCampaigns).toHaveBeenCalledTimes(1))

        // Change orderNo
        rerender({orderNo: '00005678'})

        await waitFor(() => expect(mockFetchDonationCampaigns).toHaveBeenCalledTimes(2))
        expect(mockFetchDonationCampaigns).toHaveBeenLastCalledWith('00005678', mockLocale)
    })

    it('should re-fetch when locale changes', async () => {
        const {rerender} = renderHook(
            ({locale}) =>
                useAdyenDonationCampaigns({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    site: mockSite,
                    locale,
                    orderNo: mockOrderNo
                }),
            {initialProps: {locale: mockLocale}}
        )

        await waitFor(() => expect(mockFetchDonationCampaigns).toHaveBeenCalledTimes(1))

        // Change locale
        const newLocale = {id: 'de-DE'}
        rerender({locale: newLocale})

        await waitFor(() => expect(mockFetchDonationCampaigns).toHaveBeenCalledTimes(2))
        expect(mockFetchDonationCampaigns).toHaveBeenLastCalledWith(mockOrderNo, newLocale)
    })

    it('should re-fetch when site changes', async () => {
        const {rerender} = renderHook(
            ({site}) =>
                useAdyenDonationCampaigns({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    site,
                    locale: mockLocale,
                    orderNo: mockOrderNo
                }),
            {initialProps: {site: mockSite}}
        )

        await waitFor(() => expect(mockFetchDonationCampaigns).toHaveBeenCalledTimes(1))

        // Change site
        const newSite = {id: 'new-site'}
        rerender({site: newSite})

        await waitFor(() => expect(mockFetchDonationCampaigns).toHaveBeenCalledTimes(2))
    })
})
