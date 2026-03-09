/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import useAdyenOrderNumber from '../useAdyenOrderNumber'
import {AdyenOrderNumberService} from '../../services/order-number'

jest.mock('../../services/order-number')

describe('useAdyenOrderNumber', () => {
    const mockAuthToken = 'test-token'
    const mockCustomerId = 'customer-123'
    const mockBasketId = 'basket-456'
    const mockSite = {id: 'test-site'}

    let mockFetchOrderNumber

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
        mockFetchOrderNumber = jest.fn().mockResolvedValue({orderNo: 'ORDER-12345'})

        AdyenOrderNumberService.mockImplementation(() => ({
            fetchOrderNumber: mockFetchOrderNumber
        }))
    })

    it('should initialize with loading state', () => {
        const {result} = renderHook(
            () =>
                useAdyenOrderNumber({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                }),
            {wrapper: createWrapper()}
        )

        expect(result.current.isLoading).toBe(true)
        expect(result.current.orderNo).toBeNull()
        expect(result.current.error).toBeNull()
    })

    it('should fetch order number on mount', async () => {
        const {result} = renderHook(
            () =>
                useAdyenOrderNumber({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(mockFetchOrderNumber).toHaveBeenCalled()
        })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.orderNo).toBe('ORDER-12345')
        expect(result.current.error).toBeNull()
    })

    it('should use existing order number if provided', () => {
        const {result} = renderHook(
            () =>
                useAdyenOrderNumber({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    existingOrderNo: 'EXISTING-ORDER'
                }),
            {wrapper: createWrapper()}
        )

        expect(result.current.orderNo).toBe('EXISTING-ORDER')
    })

    it('should skip fetch when skip is true', () => {
        const {result} = renderHook(
            () =>
                useAdyenOrderNumber({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    skip: true
                }),
            {wrapper: createWrapper()}
        )

        expect(result.current.isLoading).toBe(false)
        expect(mockFetchOrderNumber).not.toHaveBeenCalled()
    })

    it('should skip fetch when authToken is missing', async () => {
        const {result} = renderHook(
            () =>
                useAdyenOrderNumber({
                    authToken: null,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(mockFetchOrderNumber).not.toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
        const mockError = new Error('Fetch failed')
        mockFetchOrderNumber.mockRejectedValue(mockError)

        const {result} = renderHook(
            () =>
                useAdyenOrderNumber({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.error).toEqual(mockError)
        expect(result.current.orderNo).toBeNull()
    })

    it('should create service with correct parameters', async () => {
        renderHook(
            () =>
                useAdyenOrderNumber({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(AdyenOrderNumberService).toHaveBeenCalledWith(
                mockAuthToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
        })
    })

    it('should refetch when dependencies change', async () => {
        const {rerender} = renderHook(
            ({authToken}) =>
                useAdyenOrderNumber({
                    authToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                }),
            {initialProps: {authToken: mockAuthToken}, wrapper: createWrapper()}
        )

        await waitFor(() => {
            expect(mockFetchOrderNumber).toHaveBeenCalledTimes(1)
        })

        mockFetchOrderNumber.mockClear()

        rerender({authToken: 'new-token'})

        await waitFor(() => {
            expect(mockFetchOrderNumber).toHaveBeenCalledTimes(1)
        })
    })
})
