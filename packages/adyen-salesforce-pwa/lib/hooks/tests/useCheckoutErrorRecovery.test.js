/**
 * @jest-environment jsdom
 */
import {renderHook, waitFor} from '@testing-library/react'
import useCheckoutErrorRecovery from '../useCheckoutErrorRecovery'

const mockUseLocation = jest.fn()

jest.mock('react-router-dom', () => ({
    useLocation: () => mockUseLocation()
}))

describe('useCheckoutErrorRecovery', () => {
    let mockRefetchBasket
    let mockNavigate

    beforeEach(() => {
        jest.clearAllMocks()
        mockRefetchBasket = jest.fn().mockResolvedValue({})
        mockNavigate = jest.fn()
        mockUseLocation.mockReturnValue({
            search: '',
            pathname: '/checkout'
        })
    })

    it('should initialize with default values', () => {
        const {result} = renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: mockRefetchBasket,
                navigate: mockNavigate
            })
        )

        expect(result.current.adyenCheckoutKey).toBe(0)
        expect(result.current.isRefetchingBasket).toBe(false)
    })

    it('should not trigger recovery when no newBasketId in URL', () => {
        mockUseLocation.mockReturnValue({
            search: '',
            pathname: '/checkout'
        })

        renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: mockRefetchBasket,
                navigate: mockNavigate
            })
        )

        expect(mockNavigate).not.toHaveBeenCalled()
        expect(mockRefetchBasket).not.toHaveBeenCalled()
    })

    it('should trigger recovery when newBasketId is in URL', async () => {
        mockUseLocation.mockReturnValue({
            search: '?newBasketId=new-basket-123',
            pathname: '/checkout'
        })

        const {result} = renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: mockRefetchBasket,
                navigate: mockNavigate
            })
        )

        expect(result.current.isRefetchingBasket).toBe(true)

        await waitFor(() => {
            expect(mockRefetchBasket).toHaveBeenCalled()
        })

        await waitFor(() => {
            expect(result.current.isRefetchingBasket).toBe(false)
        })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/checkout')
        })

        await waitFor(() => {
            expect(result.current.adyenCheckoutKey).toBe(1)
        })
    })

    it('should trigger recovery when error=true is in URL without newBasketId', async () => {
        mockUseLocation.mockReturnValue({
            search: '?error=true',
            pathname: '/checkout'
        })

        const {result} = renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: mockRefetchBasket,
                navigate: mockNavigate
            })
        )

        expect(result.current.isRefetchingBasket).toBe(true)

        await waitFor(() => {
            expect(mockRefetchBasket).toHaveBeenCalled()
        })

        await waitFor(() => {
            expect(result.current.isRefetchingBasket).toBe(false)
        })

        await waitFor(() => {
            expect(result.current.adyenCheckoutKey).toBe(1)
        })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/checkout')
        })
    })

    it('should not trigger error-only recovery when newBasketId is also present', async () => {
        mockUseLocation.mockReturnValue({
            search: '?error=true&newBasketId=new-basket-123',
            pathname: '/checkout'
        })

        renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: mockRefetchBasket,
                navigate: mockNavigate
            })
        )

        await waitFor(() => {
            expect(mockRefetchBasket).toHaveBeenCalledTimes(1)
        })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/checkout')
        })

        expect(mockNavigate).toHaveBeenCalledTimes(1)
    })

    it('should not trigger recovery multiple times for same newBasketId', async () => {
        mockUseLocation.mockReturnValue({
            search: '?newBasketId=new-basket-123',
            pathname: '/checkout'
        })

        const {rerender} = renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: mockRefetchBasket,
                navigate: mockNavigate
            })
        )

        await waitFor(() => {
            expect(mockRefetchBasket).toHaveBeenCalledTimes(1)
        })

        rerender()

        await waitFor(() => {
            expect(mockRefetchBasket).toHaveBeenCalledTimes(1)
        })
    })

    it('should resume recovery on a fresh instance when the previous one unmounts before refetchBasket resolves', async () => {
        mockUseLocation.mockReturnValue({
            search: '?newBasketId=new-basket-123',
            pathname: '/checkout'
        })

        let resolveFirstRefetch
        const firstRefetchBasket = jest.fn(
            () =>
                new Promise((resolve) => {
                    resolveFirstRefetch = resolve
                })
        )
        const secondRefetchBasket = jest.fn().mockResolvedValue({})

        const {unmount} = renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: firstRefetchBasket,
                navigate: mockNavigate
            })
        )

        await waitFor(() => {
            expect(firstRefetchBasket).toHaveBeenCalledTimes(1)
        })

        // Simulate CheckoutContainer swapping Payment out for a loading skeleton
        // (e.g. a transient basket/customer query state) before the in-flight
        // refetch had a chance to resolve.
        unmount()

        // A fresh Payment instance mounts again with the same URL params still
        // present, since the previous instance never got to clear them.
        const {result} = renderHook(() =>
            useCheckoutErrorRecovery({
                refetchBasket: secondRefetchBasket,
                navigate: mockNavigate
            })
        )

        await waitFor(() => {
            expect(secondRefetchBasket).toHaveBeenCalledTimes(1)
        })

        await waitFor(() => {
            expect(result.current.adyenCheckoutKey).toBe(1)
        })

        expect(mockNavigate).toHaveBeenCalledWith('/checkout')

        // Cleanup: let the orphaned first refetch resolve so it doesn't leak
        // into other tests.
        resolveFirstRefetch({})
    })
})
