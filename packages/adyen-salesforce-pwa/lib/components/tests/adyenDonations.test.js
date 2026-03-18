/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {act, render, screen, waitFor} from '@testing-library/react'
import AdyenDonations from '../adyenDonations'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenDonationCampaigns from '../../hooks/useAdyenDonationCampaigns'
import {AdyenDonationsService} from '../../services/donations'
import {AdyenCheckout, Donation} from '@adyen/adyen-web'
import {getCheckoutConfig} from '../helpers/adyenCheckout.utils'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'

jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenDonationCampaigns')
jest.mock('../../services/donations')
jest.mock('@salesforce/commerce-sdk-react', () => ({
    useAccessToken: jest.fn(),
    useCustomerId: jest.fn()
}))
jest.mock('../helpers/adyenCheckout.utils', () => ({
    getCheckoutConfig: jest.fn(() => ({
        environment: 'test',
        clientKey: 'test_key'
    }))
}))

const mockMount = jest.fn()
const mockUnmount = jest.fn()
const mockSetStatus = jest.fn()
jest.mock('@adyen/adyen-web', () => ({
    AdyenCheckout: jest.fn(),
    Donation: jest.fn(() => ({
        mount: mockMount,
        unmount: mockUnmount,
        setStatus: mockSetStatus
    }))
}))

describe('AdyenDonations', () => {
    const defaultProps = {
        authToken: 'test-auth-token',
        site: {id: 'test-site'},
        locale: {id: 'en-US'},
        orderNo: '00001234',
        customerId: 'test-customer',
        spinner: <div data-testid="spinner">Loading...</div>,
        onDonate: jest.fn(),
        onCancel: jest.fn(),
        onComplete: jest.fn(),
        onError: [jest.fn()]
    }

    const mockEnvironmentData = {
        ADYEN_ENVIRONMENT: 'test',
        ADYEN_CLIENT_KEY: 'test_key'
    }

    const mockCampaignsData = {
        donationCampaigns: [{id: 'campaign1', name: 'Test Campaign 1'}],
        orderTotal: 100.0
    }

    let mockSubmitDonation
    let mockGetTokenWhenReady

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'error').mockImplementation(() => {})

        useAdyenEnvironment.mockReturnValue({
            data: mockEnvironmentData,
            error: null,
            isLoading: false
        })

        useCustomerId.mockReturnValue('test-customer')
        mockGetTokenWhenReady = jest.fn().mockResolvedValue('test-auth-token')
        useAccessToken.mockReturnValue({
            getTokenWhenReady: mockGetTokenWhenReady
        })

        useAdyenDonationCampaigns.mockReturnValue({
            data: mockCampaignsData,
            error: null,
            isLoading: false
        })

        getCheckoutConfig.mockReturnValue({
            environment: 'test',
            clientKey: 'test_key'
        })

        mockSubmitDonation = jest.fn().mockResolvedValue({success: true})
        AdyenDonationsService.mockImplementation(() => ({
            submitDonation: mockSubmitDonation
        }))

        AdyenCheckout.mockResolvedValue({
            create: jest.fn()
        })
    })

    it('renders spinner when fetching environment', () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        render(<AdyenDonations {...defaultProps} />)
        expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('renders spinner when fetching campaigns', () => {
        useAdyenDonationCampaigns.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        render(<AdyenDonations {...defaultProps} />)
        expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('does not render spinner when not loading', () => {
        render(<AdyenDonations {...defaultProps} />)
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
    })

    it('initializes donation component when data is ready', async () => {
        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        expect(AdyenCheckout).toHaveBeenCalled()
        expect(Donation).toHaveBeenCalled()
        expect(mockMount).toHaveBeenCalled()
    })

    it('does not initialize when environment is not available', async () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: false
        })

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        expect(AdyenCheckout).not.toHaveBeenCalled()
    })

    it('does not initialize when campaigns data is not available', async () => {
        useAdyenDonationCampaigns.mockReturnValue({
            data: null,
            error: null,
            isLoading: false
        })

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        expect(AdyenCheckout).not.toHaveBeenCalled()
    })

    it('does not initialize when no campaigns available', async () => {
        useAdyenDonationCampaigns.mockReturnValue({
            data: {donationCampaigns: [], orderTotal: 0},
            error: null,
            isLoading: false
        })

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        expect(AdyenCheckout).not.toHaveBeenCalled()
    })

    it('calls onError callbacks when environment fetch fails', async () => {
        const mockError = new Error('Environment fetch failed')
        useAdyenEnvironment.mockReturnValue({
            data: mockEnvironmentData,
            error: mockError,
            isLoading: false
        })

        render(<AdyenDonations {...defaultProps} />)

        await waitFor(() => {
            expect(defaultProps.onError[0]).toHaveBeenCalledWith(mockError)
        })
    })

    it('calls onError callbacks when campaigns fetch fails', async () => {
        const mockError = new Error('Campaigns fetch failed')
        useAdyenDonationCampaigns.mockReturnValue({
            data: mockCampaignsData,
            error: mockError,
            isLoading: false
        })

        render(<AdyenDonations {...defaultProps} />)

        await waitFor(() => {
            expect(defaultProps.onError[0]).toHaveBeenCalledWith(mockError)
        })
    })

    it('handles successful donation submission', async () => {
        const mockResponse = {success: true, donationId: 'don123'}
        mockSubmitDonation.mockResolvedValue(mockResponse)

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        // Get the onDonate handler passed to Donation component
        const donationConfig = Donation.mock.calls[0][1]
        const mockComponent = {setStatus: mockSetStatus}

        await act(async () => {
            await donationConfig.onDonate({data: {amount: 10}}, mockComponent)
        })

        expect(mockSubmitDonation).toHaveBeenCalledWith({
            orderNo: defaultProps.orderNo,
            donationCampaignId: 'campaign1',
            donationAmount: 10
        })
        expect(mockSetStatus).toHaveBeenCalledWith('success')
    })

    it('handles donation submission error', async () => {
        const mockError = new Error('Donation failed')
        mockSubmitDonation.mockRejectedValue(mockError)

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        const donationConfig = Donation.mock.calls[0][1]
        const mockComponent = {setStatus: mockSetStatus}

        await act(async () => {
            await donationConfig.onDonate({data: {amount: 10}}, mockComponent)
        })

        expect(defaultProps.onError[0]).toHaveBeenCalledWith(mockError)
        expect(mockSetStatus).toHaveBeenCalledWith('error')
    })

    it('calls onCancel callback when donation is cancelled', async () => {
        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        const donationConfig = Donation.mock.calls[0][1]
        donationConfig.onCancel()

        expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('calls onError callbacks when donation component reports error', async () => {
        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        const donationConfig = Donation.mock.calls[0][1]
        const mockError = new Error('Component error')
        const mockComponent = {setStatus: mockSetStatus}

        donationConfig.onError(mockError, mockComponent)

        expect(defaultProps.onError[0]).toHaveBeenCalledWith(mockError)
        expect(mockSetStatus).toHaveBeenCalledWith('error')
    })

    it('unmounts donation component on cleanup', async () => {
        const mockUnmountFn = jest.fn()
        let capturedDonationInstance = null

        Donation.mockImplementation(() => {
            const instance = {
                mount: jest.fn(() => instance),
                unmount: mockUnmountFn
            }
            capturedDonationInstance = instance
            return instance
        })

        const {unmount} = render(<AdyenDonations {...defaultProps} />)

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        expect(capturedDonationInstance).not.toBeNull()

        unmount()

        expect(mockUnmountFn).toHaveBeenCalled()
    })

    it('uses first campaign when multiple campaigns available', async () => {
        useAdyenDonationCampaigns.mockReturnValue({
            data: {
                donationCampaigns: [
                    {id: 'campaign1', name: 'First Campaign'},
                    {id: 'campaign2', name: 'Second Campaign'}
                ],
                orderTotal: 100
            },
            error: null,
            isLoading: false
        })

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        const donationConfig = Donation.mock.calls[0][1]
        expect(donationConfig.id).toBe('campaign1')
    })

    it('passes commercialTxAmount to donation config', async () => {
        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        const donationConfig = Donation.mock.calls[0][1]
        expect(donationConfig.commercialTxAmount).toBe(100)
    })

    it('creates AdyenDonationsService with fresh token on donate', async () => {
        mockGetTokenWhenReady.mockResolvedValue('fresh-token')
        const mockResponse = {success: true}
        mockSubmitDonation.mockResolvedValue(mockResponse)

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        const donationConfig = Donation.mock.calls[0][1]
        const mockComponent = {setStatus: mockSetStatus}

        await act(async () => {
            await donationConfig.onDonate({data: {amount: 10}}, mockComponent)
        })

        expect(AdyenDonationsService).toHaveBeenCalledWith(
            'fresh-token',
            'test-customer',
            null,
            defaultProps.site
        )
    })

    it('prevents duplicate donation submissions', async () => {
        let resolveFirst
        const firstPromise = new Promise((resolve) => {
            resolveFirst = resolve
        })
        mockSubmitDonation.mockReturnValueOnce(firstPromise)

        await act(async () => {
            render(<AdyenDonations {...defaultProps} />)
        })

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0))
        })

        const donationConfig = Donation.mock.calls[0][1]
        const mockComponent = {setStatus: mockSetStatus}

        let firstDone = false
        const first = donationConfig.onDonate({data: {amount: 10}}, mockComponent).then(() => {
            firstDone = true
        })
        const second = donationConfig.onDonate({data: {amount: 10}}, mockComponent)

        await act(async () => {
            await second
        })

        expect(AdyenDonationsService).toHaveBeenCalledTimes(1)

        await act(async () => {
            resolveFirst({success: true})
            await first
        })

        expect(firstDone).toBe(true)
        expect(mockSubmitDonation).toHaveBeenCalledTimes(1)
    })
})
