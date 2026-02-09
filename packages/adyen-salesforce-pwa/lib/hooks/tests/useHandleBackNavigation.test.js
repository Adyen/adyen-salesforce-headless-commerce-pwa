/**
 * @jest-environment jsdom
 */
import {renderHook, waitFor} from '@testing-library/react'
import useHandleBackNavigation from '../useHandleBackNavigation'
import {PaymentCancelService} from '../../services/payment-cancel'

jest.mock('../../services/payment-cancel')

describe('useHandleBackNavigation', () => {
    let mockRefetchBasket
    let mockCancelAbandonedPayment
    const mockAuthToken = 'test-auth-token'
    const mockCustomerId = 'customer-123'
    const mockBasketId = 'basket-456'
    const mockSite = {id: 'test-site'}

    beforeEach(() => {
        jest.clearAllMocks()
        mockRefetchBasket = jest.fn()
        mockCancelAbandonedPayment = jest.fn()

        PaymentCancelService.mockImplementation(() => ({
            cancelAbandonedPayment: mockCancelAbandonedPayment
        }))

        delete window.location
        window.location = {reload: jest.fn(), search: ''}
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
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
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
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
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
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
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
                    basket: {},
                    refetchBasket: mockRefetchBasket,
                    enabled: false
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockRefetchBasket).not.toHaveBeenCalled()
        })

        it('should return false if authToken is missing', async () => {
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: null,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockRefetchBasket).not.toHaveBeenCalled()
        })

        it('should return false if basketId is missing', async () => {
            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: null,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockRefetchBasket).not.toHaveBeenCalled()
        })

        it('should return false if URL has redirect parameters', async () => {
            window.location.search = '?redirectResult=abc123'

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockRefetchBasket).not.toHaveBeenCalled()
        })

        it('should return false if basket refetch returns no data', async () => {
            mockRefetchBasket.mockResolvedValue({data: {baskets: [], total: 0}})

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockRefetchBasket).toHaveBeenCalledTimes(1)
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })

        it('should return false if basket has no payment data', async () => {
            mockRefetchBasket.mockResolvedValue({
                data: {
                    baskets: [{basketId: mockBasketId}],
                    total: 1
                }
            })

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockRefetchBasket).toHaveBeenCalledTimes(1)
            expect(mockCancelAbandonedPayment).not.toHaveBeenCalled()
        })

        it('should detect abandoned payment and cancel it', async () => {
            mockRefetchBasket.mockResolvedValue({
                data: {
                    baskets: [
                        {
                            basketId: mockBasketId,
                            c_paymentData: '{"merchantReference":"00123"}',
                            c_pspReference: 'psp-ref-123'
                        }
                    ],
                    total: 1
                }
            })
            mockCancelAbandonedPayment.mockResolvedValue({success: true})

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            result.current.checkForAbandonedPayment()

            await waitFor(() => {
                expect(mockCancelAbandonedPayment).toHaveBeenCalledWith('abandoned_session')
            })

            expect(mockRefetchBasket).toHaveBeenCalledTimes(1)
            expect(PaymentCancelService).toHaveBeenCalledWith(
                mockAuthToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
            expect(window.location.reload).toHaveBeenCalled()
        })

        it('should handle errors during cancellation', async () => {
            const mockError = new Error('Cancellation failed')
            mockRefetchBasket.mockResolvedValue({
                data: {
                    baskets: [
                        {
                            basketId: mockBasketId,
                            c_paymentData: '{"merchantReference":"00123"}'
                        }
                    ],
                    total: 1
                }
            })
            mockCancelAbandonedPayment.mockRejectedValue(mockError)

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
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

        it('should check custom payment data fields', async () => {
            mockRefetchBasket.mockResolvedValue({
                data: {
                    baskets: [
                        {
                            basketId: mockBasketId,
                            c_customPaymentField: 'custom-data'
                        }
                    ],
                    total: 1
                }
            })
            mockCancelAbandonedPayment.mockResolvedValue({success: true})

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket,
                    paymentDataFields: ['c_customPaymentField']
                })
            )

            result.current.checkForAbandonedPayment()

            await waitFor(() => {
                expect(mockCancelAbandonedPayment).toHaveBeenCalled()
            })

            expect(mockRefetchBasket).toHaveBeenCalledTimes(1)
        })

        it('should check custom redirect parameters', async () => {
            window.location.search = '?customParam=value'

            const {result} = renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket,
                    redirectParams: ['customParam']
                })
            )

            const detected = await result.current.checkForAbandonedPayment()

            expect(detected).toBe(false)
            expect(mockRefetchBasket).not.toHaveBeenCalled()
        })
    })

    describe('pageshow event handling', () => {
        it('should check for abandoned payment when page is restored from bfcache', async () => {
            mockRefetchBasket.mockResolvedValue({
                data: {
                    baskets: [
                        {
                            basketId: mockBasketId,
                            c_paymentData: '{"merchantReference":"00123"}'
                        }
                    ],
                    total: 1
                }
            })
            mockCancelAbandonedPayment.mockResolvedValue({success: true})

            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            const pageshowEvent = new Event('pageshow')
            pageshowEvent.persisted = true
            window.dispatchEvent(pageshowEvent)

            await waitFor(() => {
                expect(mockRefetchBasket).toHaveBeenCalled()
            })
        })

        it('should not check for abandoned payment on normal page load', async () => {
            renderHook(() =>
                useHandleBackNavigation({
                    authToken: mockAuthToken,
                    customerId: mockCustomerId,
                    basketId: mockBasketId,
                    site: mockSite,
                    basket: {},
                    refetchBasket: mockRefetchBasket
                })
            )

            const pageshowEvent = new Event('pageshow')
            pageshowEvent.persisted = false
            window.dispatchEvent(pageshowEvent)

            await new Promise((resolve) => setTimeout(resolve, 50))

            expect(mockRefetchBasket).not.toHaveBeenCalled()
        })
    })
})
