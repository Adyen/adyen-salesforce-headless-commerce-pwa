/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook, waitFor, act} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import useTerminalPayment from '../useTerminalPayment'
import {TERMINAL_PAYMENT_STATUS} from '../../utils/constants.mjs'

const mockFetchTerminals = jest.fn()
const mockCreatePayment = jest.fn()
const mockAbortPayment = jest.fn()

jest.mock('../../services/terminal-api', () => ({
    TerminalApiService: jest.fn().mockImplementation(() => ({
        fetchTerminals: mockFetchTerminals,
        createPayment: mockCreatePayment,
        abortPayment: mockAbortPayment
    }))
}))

describe('useTerminalPayment', () => {
    const defaultProps = {
        authToken: 'token',
        customerId: 'c1',
        basketId: 'b1',
        site: {id: 'RefArch'},
        storeId: 'store-001'
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

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should start in idle status', () => {
        mockFetchTerminals.mockResolvedValue([])
        const {result} = renderHook(() => useTerminalPayment(defaultProps), {
            wrapper: createWrapper()
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.IDLE)
        expect(result.current.error).toBeNull()
        expect(result.current.result).toBeNull()
    })

    it('should fetch terminals on mount', async () => {
        const mockTerminals = [{poiId: 'V400m-123', name: 'Terminal 1', storeId: 'store-001'}]
        mockFetchTerminals.mockResolvedValue(mockTerminals)

        const {result} = renderHook(() => useTerminalPayment(defaultProps), {
            wrapper: createWrapper()
        })

        await waitFor(() => expect(result.current.isLoadingTerminals).toBe(false))
        expect(result.current.terminals).toEqual(mockTerminals)
    })

    it('should not fetch terminals when storeId is missing', async () => {
        const {result} = renderHook(() => useTerminalPayment({...defaultProps, storeId: ''}), {
            wrapper: createWrapper()
        })

        await waitFor(() => expect(result.current.isLoadingTerminals).toBe(false))
        expect(mockFetchTerminals).not.toHaveBeenCalled()
    })

    it('should transition to success on successful payment', async () => {
        mockFetchTerminals.mockResolvedValue([])
        const mockResponse = {result: 'Success', orderNo: '00001', serviceId: 'svc-123'}
        mockCreatePayment.mockResolvedValue(mockResponse)
        const onSuccess = jest.fn()

        const {result} = renderHook(() => useTerminalPayment({...defaultProps, onSuccess}), {
            wrapper: createWrapper()
        })

        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.SUCCESS)
        expect(result.current.result).toEqual(mockResponse)
        expect(result.current.error).toBeNull()
        expect(onSuccess).toHaveBeenCalledWith(mockResponse)
    })

    it('should transition to declined on failed payment result', async () => {
        mockFetchTerminals.mockResolvedValue([])
        const mockResponse = {result: 'Failure', error: 'Refused'}
        mockCreatePayment.mockResolvedValue(mockResponse)
        const onDeclined = jest.fn()

        const {result} = renderHook(() => useTerminalPayment({...defaultProps, onDeclined}), {
            wrapper: createWrapper()
        })

        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.DECLINED)
        expect(result.current.result).toEqual(mockResponse)
        expect(onDeclined).toHaveBeenCalledWith(mockResponse)
    })

    it('should transition to error on network failure', async () => {
        mockFetchTerminals.mockResolvedValue([])
        const mockError = new Error('Network request failed')
        mockCreatePayment.mockRejectedValue(mockError)
        const onError = jest.fn()

        const {result} = renderHook(() => useTerminalPayment({...defaultProps, onError}), {
            wrapper: createWrapper()
        })

        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.ERROR)
        expect(result.current.error).toBe(mockError)
        expect(result.current.result).toBeNull()
        expect(onError).toHaveBeenCalledWith(mockError)
    })

    it('should abort payment and transition to cancelled', async () => {
        mockFetchTerminals.mockResolvedValue([])
        const paymentResponse = {result: 'Success', orderNo: '00001', serviceId: 'svc-123'}
        mockCreatePayment.mockResolvedValue(paymentResponse)
        const abortResponse = {success: true, newBasketId: 'basket-new'}
        mockAbortPayment.mockResolvedValue(abortResponse)
        const onAbort = jest.fn()

        const {result} = renderHook(() => useTerminalPayment({...defaultProps, onAbort}), {
            wrapper: createWrapper()
        })

        // First send payment to populate context
        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        // Then abort
        await act(async () => {
            await result.current.abortPayment()
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.CANCELLED)
        expect(result.current.result).toEqual(abortResponse)
        expect(onAbort).toHaveBeenCalledWith(abortResponse)
    })

    it('should handle abort error gracefully', async () => {
        mockFetchTerminals.mockResolvedValue([])
        const paymentResponse = {result: 'Success', orderNo: '00001', serviceId: 'svc-123'}
        mockCreatePayment.mockResolvedValue(paymentResponse)
        const abortError = new Error('Abort failed')
        mockAbortPayment.mockRejectedValue(abortError)
        const onError = jest.fn()

        const {result} = renderHook(() => useTerminalPayment({...defaultProps, onError}), {
            wrapper: createWrapper()
        })

        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        await act(async () => {
            await result.current.abortPayment()
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.CANCELLED)
        expect(result.current.error).toBe(abortError)
        expect(onError).toHaveBeenCalledWith(abortError)
    })

    it('should reset state to idle', async () => {
        mockFetchTerminals.mockResolvedValue([])
        mockCreatePayment.mockRejectedValue(new Error('fail'))

        const {result} = renderHook(() => useTerminalPayment(defaultProps), {
            wrapper: createWrapper()
        })

        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.ERROR)

        act(() => {
            result.current.reset()
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.IDLE)
        expect(result.current.error).toBeNull()
        expect(result.current.result).toBeNull()
    })

    it('should not send payment when not in idle state', async () => {
        mockFetchTerminals.mockResolvedValue([])
        mockCreatePayment.mockResolvedValue({result: 'Success', orderNo: '00001', serviceId: 's1'})

        const {result} = renderHook(() => useTerminalPayment(defaultProps), {
            wrapper: createWrapper()
        })

        // First payment
        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.SUCCESS)

        // Try sending again without reset — should be ignored
        mockCreatePayment.mockClear()
        await act(async () => {
            await result.current.sendPayment('V400m-123')
        })

        expect(mockCreatePayment).not.toHaveBeenCalled()
    })

    it('should not abort when no serviceId exists', async () => {
        mockFetchTerminals.mockResolvedValue([])

        const {result} = renderHook(() => useTerminalPayment(defaultProps), {
            wrapper: createWrapper()
        })

        await act(async () => {
            await result.current.abortPayment()
        })

        // Should stay idle — abort is a no-op
        expect(result.current.status).toBe(TERMINAL_PAYMENT_STATUS.IDLE)
        expect(mockAbortPayment).not.toHaveBeenCalled()
    })
})
