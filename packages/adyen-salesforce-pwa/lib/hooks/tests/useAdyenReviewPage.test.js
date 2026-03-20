/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook, waitFor, act} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import useAdyenReviewPage from '../useAdyenReviewPage'
import {AdyenPaymentDataReviewPageService} from '../../services/payment-data-review-page'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'

jest.mock('../../services/payment-data-review-page')
jest.mock('../../services/payments-details')

describe('useAdyenReviewPage', () => {
    const defaultProps = {
        authToken: 'test-token',
        customerId: 'customer-123',
        basketId: 'basket-456',
        site: {id: 'RefArch'}
    }

    const createWrapper = () => {
        const queryClient = new QueryClient({
            defaultOptions: {queries: {retry: false, staleTime: 0, cacheTime: 0}}
        })
        // eslint-disable-next-line react/display-name, react/prop-types
        return ({children}) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
    }

    let mockGetPaymentData
    let mockSubmitPaymentsDetails

    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPaymentData = jest.fn()
        mockSubmitPaymentsDetails = jest.fn()

        AdyenPaymentDataReviewPageService.mockImplementation(() => ({
            getPaymentData: mockGetPaymentData
        }))
        AdyenPaymentsDetailsService.mockImplementation(() => ({
            submitPaymentsDetails: mockSubmitPaymentsDetails
        }))
    })

    it('should fetch payment data on mount', async () => {
        const mockData = {paymentData: 'test-data'}
        mockGetPaymentData.mockResolvedValue(mockData)

        const {result} = renderHook(() => useAdyenReviewPage(defaultProps), {
            wrapper: createWrapper()
        })

        expect(result.current.isLoading).toBe(true)

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.paymentData).toEqual(mockData)
        expect(result.current.error).toBeNull()
    })

    it('should set error when fetch fails', async () => {
        const mockError = new Error('Fetch failed')
        mockGetPaymentData.mockRejectedValue(mockError)

        const {result} = renderHook(() => useAdyenReviewPage(defaultProps), {
            wrapper: createWrapper()
        })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.paymentData).toBeNull()
        expect(result.current.error).toBe(mockError)
    })

    it('should skip fetching when skip is true', async () => {
        const {result} = renderHook(() => useAdyenReviewPage({...defaultProps, skip: true}), {
            wrapper: createWrapper()
        })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(mockGetPaymentData).not.toHaveBeenCalled()
        expect(result.current.paymentData).toBeNull()
    })

    it('should skip fetching when authToken is missing', async () => {
        const {result} = renderHook(() => useAdyenReviewPage({...defaultProps, authToken: null}), {
            wrapper: createWrapper()
        })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(mockGetPaymentData).not.toHaveBeenCalled()
    })

    it('should skip fetching when basketId is missing', async () => {
        const {result} = renderHook(() => useAdyenReviewPage({...defaultProps, basketId: null}), {
            wrapper: createWrapper()
        })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(mockGetPaymentData).not.toHaveBeenCalled()
    })

    describe('submitPaymentDetails', () => {
        it('should submit payment details with provided data', async () => {
            const mockPaymentData = {paymentData: 'test-data'}
            const mockResponse = {resultCode: 'Authorised'}
            mockGetPaymentData.mockResolvedValue(mockPaymentData)
            mockSubmitPaymentsDetails.mockResolvedValue(mockResponse)

            const {result} = renderHook(() => useAdyenReviewPage(defaultProps), {
                wrapper: createWrapper()
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            let response
            await act(async () => {
                response = await result.current.submitPaymentDetails({custom: 'data'})
            })

            expect(mockSubmitPaymentsDetails).toHaveBeenCalledWith({custom: 'data'})
            expect(response).toEqual(mockResponse)
        })

        it('should use fetched paymentData when no data is provided', async () => {
            const mockPaymentData = {paymentData: 'test-data'}
            const mockResponse = {resultCode: 'Authorised'}
            mockGetPaymentData.mockResolvedValue(mockPaymentData)
            mockSubmitPaymentsDetails.mockResolvedValue(mockResponse)

            const {result} = renderHook(() => useAdyenReviewPage(defaultProps), {
                wrapper: createWrapper()
            })

            await waitFor(() => {
                expect(result.current.paymentData).toEqual(mockPaymentData)
            })

            await act(async () => {
                await result.current.submitPaymentDetails()
            })

            expect(mockSubmitPaymentsDetails).toHaveBeenCalledWith(mockPaymentData)
        })

        it('should throw when no payment data is available', async () => {
            const {result} = renderHook(() => useAdyenReviewPage({...defaultProps, skip: true}), {
                wrapper: createWrapper()
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            await expect(
                act(async () => {
                    await result.current.submitPaymentDetails()
                })
            ).rejects.toThrow('No payment data available')
        })

        it('should set error and rethrow when submission fails', async () => {
            const mockPaymentData = {paymentData: 'test-data'}
            const mockError = new Error('Submit failed')
            mockGetPaymentData.mockResolvedValue(mockPaymentData)
            mockSubmitPaymentsDetails.mockRejectedValue(mockError)

            const {result} = renderHook(() => useAdyenReviewPage(defaultProps), {
                wrapper: createWrapper()
            })

            await waitFor(() => {
                expect(result.current.paymentData).toEqual(mockPaymentData)
            })

            let caughtError
            await act(async () => {
                try {
                    await result.current.submitPaymentDetails()
                } catch (err) {
                    caughtError = err
                }
            })

            expect(caughtError).toBe(mockError)
            expect(result.current.error).toBe(mockError)
            expect(result.current.isSubmitting).toBe(false)
        })
    })

    describe('refetch', () => {
        it('should refetch payment data', async () => {
            const mockData1 = {paymentData: 'data-1'}
            const mockData2 = {paymentData: 'data-2'}
            mockGetPaymentData.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2)

            const {result} = renderHook(() => useAdyenReviewPage(defaultProps), {
                wrapper: createWrapper()
            })

            await waitFor(() => {
                expect(result.current.paymentData).toEqual(mockData1)
            })

            await act(async () => {
                await result.current.refetch()
            })

            await waitFor(() => {
                expect(result.current.paymentData).toEqual(mockData2)
            })
        })
    })
})
