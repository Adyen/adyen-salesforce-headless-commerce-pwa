/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import useAdyenPaymentMethods from '../useAdyenPaymentMethods'

const mockFetchPaymentMethods = jest.fn()

jest.mock('../../services/payment-methods', () => ({
    AdyenPaymentMethodsService: jest.fn().mockImplementation(() => ({
        fetchPaymentMethods: mockFetchPaymentMethods
    }))
}))

describe('useAdyenPaymentMethods', () => {
    const createWrapper = () => {
        const queryClient = new QueryClient({
            defaultOptions: {queries: {retry: false}}
        })
        // eslint-disable-next-line react/display-name, react/prop-types
        return ({children}) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should fetch payment methods on mount', async () => {
        const mockData = {paymentMethods: [{type: 'scheme'}]}
        mockFetchPaymentMethods.mockResolvedValue(mockData)

        const {result} = renderHook(
            () =>
                useAdyenPaymentMethods({
                    authToken: 'token',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'},
                    locale: {id: 'en-US'}
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.data).toEqual(mockData)
        expect(result.current.error).toBeNull()
    })

    it('should skip fetch when skip is true', async () => {
        const {result} = renderHook(
            () =>
                useAdyenPaymentMethods({
                    authToken: 'token',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'},
                    locale: {id: 'en-US'},
                    skip: true
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(mockFetchPaymentMethods).not.toHaveBeenCalled()
    })

    it('should skip fetch when authToken is falsy', async () => {
        const {result} = renderHook(
            () =>
                useAdyenPaymentMethods({
                    authToken: '',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'},
                    locale: {id: 'en-US'}
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(mockFetchPaymentMethods).not.toHaveBeenCalled()
    })

    it('should set error when fetch fails', async () => {
        const mockError = new Error('fetch failed')
        mockFetchPaymentMethods.mockRejectedValue(mockError)

        const {result} = renderHook(
            () =>
                useAdyenPaymentMethods({
                    authToken: 'token',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'},
                    locale: {id: 'en-US'}
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.error).toBe(mockError)
        expect(result.current.data).toBeNull()
    })
})
