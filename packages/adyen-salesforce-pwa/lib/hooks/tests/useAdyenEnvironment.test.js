/**
 * @jest-environment jsdom
 */
import {renderHook, waitFor} from '@testing-library/react'
import useAdyenEnvironment from '../useAdyenEnvironment'

const mockFetchEnvironment = jest.fn()

jest.mock('../../services/environment', () => ({
    AdyenEnvironmentService: jest.fn().mockImplementation(() => ({
        fetchEnvironment: mockFetchEnvironment
    }))
}))

describe('useAdyenEnvironment', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should fetch environment data on mount', async () => {
        const mockData = {environment: 'test', clientKey: 'key'}
        mockFetchEnvironment.mockResolvedValue(mockData)

        const {result} = renderHook(() =>
            useAdyenEnvironment({
                authToken: 'token',
                customerId: 'c1',
                basketId: 'b1',
                site: {id: 'RefArch'}
            })
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.data).toEqual(mockData)
        expect(result.current.error).toBeNull()
    })

    it('should skip fetch when skip is true', async () => {
        const {result} = renderHook(() =>
            useAdyenEnvironment({
                authToken: 'token',
                customerId: 'c1',
                basketId: 'b1',
                site: {id: 'RefArch'},
                skip: true
            })
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(mockFetchEnvironment).not.toHaveBeenCalled()
    })

    it('should skip fetch when authToken is falsy', async () => {
        const {result} = renderHook(() =>
            useAdyenEnvironment({
                authToken: '',
                customerId: 'c1',
                basketId: 'b1',
                site: {id: 'RefArch'}
            })
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(mockFetchEnvironment).not.toHaveBeenCalled()
    })

    it('should set error when fetch fails', async () => {
        const mockError = new Error('fetch failed')
        mockFetchEnvironment.mockRejectedValue(mockError)

        const {result} = renderHook(() =>
            useAdyenEnvironment({
                authToken: 'token',
                customerId: 'c1',
                basketId: 'b1',
                site: {id: 'RefArch'}
            })
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.error).toBe(mockError)
        expect(result.current.data).toBeNull()
    })
})
