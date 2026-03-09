/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import useAdyenEnvironment from '../useAdyenEnvironment'

const mockFetchEnvironment = jest.fn()

jest.mock('../../services/environment', () => ({
    AdyenEnvironmentService: jest.fn().mockImplementation(() => ({
        fetchEnvironment: mockFetchEnvironment
    }))
}))

describe('useAdyenEnvironment', () => {
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

    it('should fetch environment data on mount', async () => {
        const mockData = {environment: 'test', clientKey: 'key'}
        mockFetchEnvironment.mockResolvedValue(mockData)

        const {result} = renderHook(
            () =>
                useAdyenEnvironment({
                    authToken: 'token',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'}
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
                useAdyenEnvironment({
                    authToken: 'token',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'},
                    skip: true
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(mockFetchEnvironment).not.toHaveBeenCalled()
    })

    it('should skip fetch when authToken is falsy', async () => {
        const {result} = renderHook(
            () =>
                useAdyenEnvironment({
                    authToken: '',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'}
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(mockFetchEnvironment).not.toHaveBeenCalled()
    })

    it('should set error when fetch fails', async () => {
        const mockError = new Error('fetch failed')
        mockFetchEnvironment.mockRejectedValue(mockError)

        const {result} = renderHook(
            () =>
                useAdyenEnvironment({
                    authToken: 'token',
                    customerId: 'c1',
                    basketId: 'b1',
                    site: {id: 'RefArch'}
                }),
            {wrapper: createWrapper()}
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.error).toBe(mockError)
        expect(result.current.data).toBeNull()
    })
})
