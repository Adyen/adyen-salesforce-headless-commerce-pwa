/**
 * @jest-environment jsdom
 */
import {renderHook, waitFor} from '@testing-library/react'
import useHandleBackNavigation from '../useHandleBackNavigation'
import {PaymentCancelService} from '../../services/payment-cancel'

jest.mock('../../services/payment-cancel')

describe('useHandleBackNavigation', () => {
    let mockCancelAbandonedPayment
    const mockAuthToken = 'test-auth-token'
    const mockCustomerId = 'customer-123'
    const mockBasketId = 'basket-456'
    const mockSite = {id: 'test-site'}

    beforeEach(() => {
        jest.clearAllMocks()
        mockCancelAbandonedPayment = jest.fn()

        PaymentCancelService.mockImplementation(() => ({
            cancelAbandonedPayment: mockCancelAbandonedPayment
        }))

        window.history.replaceState(null, '', '/')
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('initialization', () => {
        it('should initialize without errors', () => {
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            expect(result.current.error).toBeNull()
            expect(result.current.checkForAbandonedPayment).toBeInstanceOf(Function)
        })

        it('should set up pageshow event listener', () => {
            const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            expect(addEventListenerSpy).toHaveBeenCalledWith('pageshow', expect.any(Function))
        })

        it('should clean up event listener on unmount', () => {
            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

            const {unmount} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            unmount()

            expect(removeEventListenerSpy).toHaveBeenCalledWith('pageshow', expect.any(Function))
        })
    })

    describe('checkForAbandonedPayment', () => {
        it('should return false if not enabled', async () => {
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    enabled: false
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })

        it('should return false if authToken is missing', async () => {
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: null,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })

        it('should return false if basketId is missing', async () => {
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: null,
                    site: mockSite
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })

        it('should return false if URL has redirect parameters', async () => {
            window.history.replaceState(null, '', '/?redirectResult=abc123')

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })

        it('should return false if cancel response indicates not cancelled', async () => {
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: false})

            const mockNavigate = jest.fn()
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockCancelAbandonedPayment).toHaveBeenCalledWith('abandoned_session', null)
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it('should extract orderNo from URL params', async () => {
            window.history.replaceState(null, '', '/?orderNo=00123456')
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: true})

            const mockNavigate = jest.fn()
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            await result.current.checkForAbandonedPayment()

            expect(mockCancelAbandonedPayment).toHaveBeenCalledWith('abandoned_session', '00123456')
        })

        it('should detect abandoned payment and cancel it via navigate', async () => {
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: true})
            const mockNavigate = jest.fn()

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            result.current.checkForAbandonedPayment()

            await waitFor(() => {
                expect(mockCancelAbandonedPayment).toHaveBeenCalledWith('abandoned_session', null)
            })

            expect(PaymentCancelService).toHaveBeenCalledWith(
                mockAuthToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
            expect(mockNavigate).toHaveBeenCalledWith('/checkout?')
        })

        it('should handle errors during cancellation', async () => {
            const mockError = new Error('Cancellation failed')
            mockCancelAbandonedPayment.mockRejectedValue(mockError)

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error in abandoned payment detection:',
                mockError
            )

            await waitFor(() => {
                expect(result.current.error).toBe(mockError)
            })

            consoleErrorSpy.mockRestore()
        })

        it('should navigate with newBasketId when cancel response includes one', async () => {
            const mockNavigate = jest.fn()
            mockCancelAbandonedPayment.mockResolvedValue({
                cancelled: true,
                newBasketId: 'new-basket-789'
            })

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            result.current.checkForAbandonedPayment()

            await waitFor(() => {
                expect(mockCancelAbandonedPayment).toHaveBeenCalled()
            })

            expect(mockNavigate).toHaveBeenCalledWith('/checkout?newBasketId=new-basket-789')
        })

        it('should check custom redirect parameters', async () => {
            window.history.replaceState(null, '', '/?customParam=value')

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    redirectParams: ['customParam']
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })
    })

    describe('popstate event handling', () => {
        it('should register a popstate event listener on mount', () => {
            const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
        })

        it('should remove popstate listener on unmount', () => {
            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

            const {unmount} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite
                })
            )

            unmount()

            expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
        })

        it('should call cancelAbandonedPayment on popstate when orderNo is in URL', async () => {
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: false})
            const mockNavigate = jest.fn()

            window.history.replaceState(null, '', '/?orderNo=00013422')

            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            await waitFor(() => expect(mockCancelAbandonedPayment).toHaveBeenCalledTimes(1))

            mockCancelAbandonedPayment.mockClear()
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: true})

            window.dispatchEvent(new PopStateEvent('popstate'))

            await waitFor(() => {
                expect(mockCancelAbandonedPayment).toHaveBeenCalledWith(
                    'abandoned_session',
                    '00013422'
                )
            })
        })

        it('should not call cancelAbandonedPayment on popstate when orderNo is absent', async () => {
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: true})
            const mockNavigate = jest.fn()

            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            mockCancelAbandonedPayment.mockClear()

            window.history.replaceState(null, '', '/checkout')
            window.dispatchEvent(new PopStateEvent('popstate'))

            await new Promise((resolve) => setTimeout(resolve, 50))

            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })
    })

    describe('deferred check when authToken arrives after mount', () => {
        it('should defer and retry checkForAbandonedPayment when authToken is initially missing but orderNo is in URL', async () => {
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: true})
            const mockNavigate = jest.fn()

            window.history.replaceState(null, '', '/?orderNo=00013421')

            const {rerender} = renderHook(
                ({authToken}) =>
                    useHandleBackNavigation({
                        authToken,
                        customerId: mockCustomerId,
                        basketId: mockBasketId,
                        site: mockSite,
                        navigate: mockNavigate
                    }),
                {initialProps: {authToken: null}}
            )

            await new Promise((resolve) => setTimeout(resolve, 50))
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()

            rerender({authToken: mockAuthToken})

            await waitFor(() => {
                expect(mockCancelAbandonedPayment).toHaveBeenCalledWith(
                    'abandoned_session',
                    '00013421'
                )
            })
        })

        it('should not retry when authToken arrives but orderNo was not in URL at mount', async () => {
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: true})
            const mockNavigate = jest.fn()

            window.history.replaceState(null, '', '/checkout')

            const {rerender} = renderHook(
                ({authToken}) =>
                    useHandleBackNavigation({
                        authToken,
                        customerId: mockCustomerId,
                        basketId: mockBasketId,
                        site: mockSite,
                        navigate: mockNavigate
                    }),
                {initialProps: {authToken: null}}
            )

            rerender({authToken: mockAuthToken})

            await new Promise((resolve) => setTimeout(resolve, 50))

            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })
    })

    describe('pageshow event handling', () => {
        it('should check for abandoned payment when page is restored from bfcache', async () => {
            mockCancelAbandonedPayment.mockResolvedValue({cancelled: true})
            const mockNavigate = jest.fn()

            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            const pageshowEvent = new Event('pageshow')
            pageshowEvent.persisted = true
            window.dispatchEvent(pageshowEvent)

            await waitFor(() => {
                expect(mockCancelAbandonedPayment).toHaveBeenCalled()
            })
        })

        it('should not check for abandoned payment on normal page load', async () => {
            const mockNavigate = jest.fn()
            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    navigate: mockNavigate
                })
            )

            mockCancelAbandonedPayment.mockClear()

            const pageshowEvent = new Event('pageshow')
            pageshowEvent.persisted = false
            window.dispatchEvent(pageshowEvent)

            await new Promise((resolve) => setTimeout(resolve, 50))

            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })
    })
})
