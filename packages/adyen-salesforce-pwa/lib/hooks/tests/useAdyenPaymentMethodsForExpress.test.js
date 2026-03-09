/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import useAdyenPaymentMethodsForExpress from '../useAdyenPaymentMethodsForExpress'
import {AdyenPaymentMethodsForExpressService} from '../../services/payment-methods-for-express'

jest.mock('../../services/payment-methods-for-express')

describe('useAdyenPaymentMethodsForExpress', () => {
    const defaultProps = {
        authToken: 'test-token',
        customerId: 'customer-123',
        site: {id: 'RefArch'},
        locale: {id: 'en-US'},
        currency: 'USD'
    }

    const createWrapper = () => {
        const queryClient = new QueryClient({
            defaultOptions: {queries: {retry: false}}
        })
        // eslint-disable-next-line react/display-name, react/prop-types
        return ({children}) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
    }

    let mockFetchPaymentMethodsForExpress

    beforeEach(() => {
        jest.clearAllMocks()
        mockFetchPaymentMethodsForExpress = jest.fn()
        AdyenPaymentMethodsForExpressService.mockImplementation(() => ({
            fetchPaymentMethodsForExpress: mockFetchPaymentMethodsForExpress
        }))
    })

    it('should fetch payment methods on mount', async () => {
        const mockData = {paymentMethods: [{type: 'applepay'}]}
        mockFetchPaymentMethodsForExpress.mockResolvedValue(mockData)

        const {result} = renderHook(() => useAdyenPaymentMethodsForExpress(defaultProps), {
            wrapper: createWrapper()
        })

        expect(result.current.isLoading).toBe(true)

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data).toEqual(mockData)
        expect(result.current.error).toBeNull()
        expect(mockFetchPaymentMethodsForExpress).toHaveBeenCalledWith(
            defaultProps.locale,
            defaultProps.currency
        )
    })

    it('should set error when fetch fails', async () => {
        const mockError = new Error('Fetch failed')
        mockFetchPaymentMethodsForExpress.mockRejectedValue(mockError)

        const {result} = renderHook(() => useAdyenPaymentMethodsForExpress(defaultProps), {
            wrapper: createWrapper()
        })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data).toBeNull()
        expect(result.current.error).toBe(mockError)
    })

    it('should skip fetching when skip is true', async () => {
        const {result} = renderHook(
            () => useAdyenPaymentMethodsForExpress({...defaultProps, skip: true}),
            {wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(mockFetchPaymentMethodsForExpress).not.toHaveBeenCalled()
        expect(result.current.data).toBeNull()
    })

    it('should skip fetching when authToken is missing', async () => {
        const {result} = renderHook(
            () => useAdyenPaymentMethodsForExpress({...defaultProps, authToken: null}),
            {wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(mockFetchPaymentMethodsForExpress).not.toHaveBeenCalled()
    })

    it('should skip fetching when currency is missing', async () => {
        const {result} = renderHook(
            () => useAdyenPaymentMethodsForExpress({...defaultProps, currency: ''}),
            {wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(mockFetchPaymentMethodsForExpress).not.toHaveBeenCalled()
    })

    it('should construct service with correct parameters', async () => {
        mockFetchPaymentMethodsForExpress.mockResolvedValue({})

        renderHook(() => useAdyenPaymentMethodsForExpress(defaultProps), {wrapper: createWrapper()})

        await waitFor(() => {
            expect(AdyenPaymentMethodsForExpressService).toHaveBeenCalledWith(
                defaultProps.authToken,
                defaultProps.customerId,
                defaultProps.site
            )
        })
    })
})
