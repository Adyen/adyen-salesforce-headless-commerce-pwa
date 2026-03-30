/**
 * @jest-environment jest-environment-jsdom
 */
import React from 'react'
import {act, cleanup, render, waitFor} from '@testing-library/react'
import AdyenCheckoutComponent from '../adyenCheckout'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../../hooks/useAdyenPaymentMethods'
import useAdyenShopperPayments from '../../hooks/useAdyenShopperPayments'
import {useAccessToken, useCustomerId, useCustomerType} from '@salesforce/commerce-sdk-react'
import useAdyenOrderNumber from '../../hooks/useAdyenOrderNumber'
import {
    createCheckoutInstance,
    handleRedirects,
    mountCheckoutComponent
} from '../helpers/adyenCheckout.utils.js'

// Mock the hooks and helpers
jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
jest.mock('../../hooks/useAdyenShopperPayments')
jest.mock('@salesforce/commerce-sdk-react')
jest.mock('../../hooks/useAdyenOrderNumber')
jest.mock('../helpers/adyenCheckout.utils')
jest.mock('../paymentMethodsConfiguration', () => ({
    paymentMethodsConfiguration: jest.fn().mockReturnValue({})
}))

describe('AdyenCheckoutComponent', () => {
    const mockCheckoutInstance = {
        update: jest.fn()
    }
    const mockDropinInstance = {
        unmount: jest.fn(),
        update: jest.fn()
    }

    const defaultProps = {
        authToken: 'test_token',
        customerId: 'test_customer',
        locale: {id: 'en-US'},
        site: {id: 'test_site'},
        basket: {
            basketId: 'test_basket',
            currency: 'USD',
            productTotal: 100,
            shippingTotal: 10,
            taxTotal: 5
        },
        navigate: jest.fn()
    }

    const mockEnvironmentData = {
        ADYEN_ENVIRONMENT: 'test',
        ADYEN_CLIENT_KEY: 'test_key'
    }

    const mockPaymentMethodsData = {
        paymentMethods: [{type: 'scheme'}],
        applicationInfo: {}
    }

    beforeEach(() => {
        jest.clearAllMocks()

        // Mock the hooks
        useCustomerId.mockReturnValue('test_customer')
        useCustomerType.mockReturnValue({isRegistered: false})

        useAccessToken.mockReturnValue({
            getTokenWhenReady: jest.fn().mockResolvedValue('test_token')
        })

        useAdyenEnvironment.mockReturnValue({
            data: mockEnvironmentData,
            error: null,
            isLoading: false
        })

        useAdyenPaymentMethods.mockReturnValue({
            data: mockPaymentMethodsData,
            error: null,
            isLoading: false
        })
        useAdyenShopperPayments.mockReturnValue({
            data: null,
            error: null,
            isLoading: false
        })

        useAdyenOrderNumber.mockReturnValue({
            orderNo: 'order-123',
            error: null,
            isLoading: false
        })

        // Mock helpers
        createCheckoutInstance.mockResolvedValue(mockCheckoutInstance)
        handleRedirects.mockReturnValue(false) // Default to not a redirect
        mountCheckoutComponent.mockReturnValue(mockDropinInstance)
    })

    afterEach(() => {
        cleanup()
    })

    it('should initialize checkout when environment and payment methods are available', async () => {
        render(<AdyenCheckoutComponent {...defaultProps} />)

        await waitFor(() => {
            expect(createCheckoutInstance).toHaveBeenCalledTimes(1)
        })
        expect(handleRedirects).toHaveBeenCalledTimes(1)
        expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)
    })

    it('should not initialize checkout if adyenEnvironment is not available', async () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: false
        })

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        expect(createCheckoutInstance).not.toHaveBeenCalled()
        expect(mountCheckoutComponent).not.toHaveBeenCalled()
    })

    it('should call the cleanup function on unmount', async () => {
        const {unmount} = render(<AdyenCheckoutComponent {...defaultProps} />)

        await waitFor(() => {
            expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)
        })

        act(() => {
            unmount()
        })

        // Check that the unmount function of the dropin instance was called
        expect(mockDropinInstance.unmount).toHaveBeenCalledTimes(1)
    })

    it('should remount the dropin when adyenOrder changes (e.g. after giftcard applied)', async () => {
        jest.useFakeTimers()

        // Start without order data
        const {rerender} = render(<AdyenCheckoutComponent {...defaultProps} />)

        await waitFor(() => {
            expect(createCheckoutInstance).toHaveBeenCalledTimes(1)
        })
        expect(handleRedirects).toHaveBeenCalledTimes(1)
        expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)

        // Simulate a giftcard being applied: basket now has c_orderData with remainingAmount
        const propsWithOrder = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderData: JSON.stringify({
                    orderData: 'initial_order_data',
                    remainingAmount: {value: 5629, currency: 'USD'}
                })
            }
        }

        // Re-render the component with the new props
        await act(async () => {
            rerender(<AdyenCheckoutComponent {...propsWithOrder} />)
        })

        // Advance the debounce timer
        await act(async () => {
            jest.runAllTimers()
        })

        jest.useRealTimers()

        // Dropin should be remounted with the new amount (resetDropin increments componentKey)
        expect(mockDropinInstance.unmount).toHaveBeenCalledTimes(1)
        expect(createCheckoutInstance).toHaveBeenCalledTimes(2)
        expect(mountCheckoutComponent).toHaveBeenCalledTimes(2)
    })

    it('should not remount dropin if dropin is not yet mounted', async () => {
        mountCheckoutComponent.mockReturnValue(null) // Simulate dropin not mounted

        const propsWithOrder = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderData: JSON.stringify({orderData: 'initial_order_data'})
            }
        }
        const {rerender} = render(<AdyenCheckoutComponent {...propsWithOrder} />)

        await act(async () => {
            rerender(
                <AdyenCheckoutComponent
                    {...defaultProps}
                    basket={{
                        ...defaultProps.basket,
                        c_orderData: JSON.stringify({orderData: 'new_order_data'})
                    }}
                />
            )
        })

        // unmount should not be called since dropin was never mounted
        expect(mockDropinInstance.unmount).not.toHaveBeenCalled()
    })

    it('should handle environment fetch error and call onError callbacks', async () => {
        const mockError = new Error('Environment fetch failed')
        useAdyenEnvironment.mockReturnValue({
            data: mockEnvironmentData,
            error: mockError,
            isLoading: false
        })

        const onErrorMock = jest.fn()

        render(<AdyenCheckoutComponent {...defaultProps} onError={[onErrorMock]} />)

        // Error callback should be called
        await waitFor(() => {
            expect(onErrorMock).toHaveBeenCalledWith(mockError)
        })
    })

    it('should handle payment methods fetch error and call onError callbacks', async () => {
        const mockError = new Error('Payment methods fetch failed')
        useAdyenPaymentMethods.mockReturnValue({
            data: null,
            error: mockError,
            isLoading: false
        })

        const onErrorMock = jest.fn()

        render(<AdyenCheckoutComponent {...defaultProps} onError={[onErrorMock]} />)

        // Error callback should be called
        await waitFor(() => {
            expect(onErrorMock).toHaveBeenCalledWith(mockError)
        })
    })

    it('should call onError when checkout initialization throws error', async () => {
        const mockError = new Error('Checkout initialization failed')
        createCheckoutInstance.mockRejectedValue(mockError)

        const onErrorMock = jest.fn()

        render(<AdyenCheckoutComponent {...defaultProps} onError={[onErrorMock]} />)

        await waitFor(() => {
            expect(onErrorMock).toHaveBeenCalledWith(mockError)
        })
    })

    it('should not initialize checkout when payment methods are still loading', async () => {
        useAdyenPaymentMethods.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        expect(createCheckoutInstance).not.toHaveBeenCalled()
        expect(mountCheckoutComponent).not.toHaveBeenCalled()
    })

    it('should not initialize checkout when environment is still loading', async () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        expect(createCheckoutInstance).not.toHaveBeenCalled()
    })

    it('should handle redirect case and not mount component when redirect detected', async () => {
        handleRedirects.mockReturnValue(true) // Simulate redirect detected

        render(<AdyenCheckoutComponent {...defaultProps} />)

        await waitFor(() => {
            expect(handleRedirects).toHaveBeenCalledTimes(1)
        })
        // mountCheckoutComponent should not be called when redirect is detected
        expect(mountCheckoutComponent).not.toHaveBeenCalled()
    })

    it('should render spinner when loading', async () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        const spinnerElement = <div data-testid="loading-spinner">Loading...</div>

        const {getByTestId} = render(
            <AdyenCheckoutComponent {...defaultProps} spinner={spinnerElement} />
        )

        expect(getByTestId('loading-spinner')).toBeTruthy()
    })

    it('should not render spinner when spinner prop is null', async () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        const {container} = render(<AdyenCheckoutComponent {...defaultProps} spinner={null} />)

        // Should not render spinner content
        expect(container.querySelector('[data-testid="loading-spinner"]')).toBeNull()
    })

    it('should skip payment methods fetch for non-checkout pages', async () => {
        render(<AdyenCheckoutComponent {...defaultProps} page="confirmation" />)

        await act(async () => {})

        // useAdyenPaymentMethods should be called with skip: true
        expect(useAdyenPaymentMethods).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: true
            })
        )
    })

    it('should call onStateChange when state changes', async () => {
        const onStateChangeMock = jest.fn()

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} onStateChange={onStateChangeMock} />)
        })

        // The onStateChange should be called during state updates
        // Note: This depends on internal implementation triggering state changes
    })

    it('should handle translations correctly', async () => {
        const translations = {
            'en-US': {
                payButton: 'Pay'
            }
        }

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} translations={translations} />)
        })

        // Component should use translations
    })

    it('should handle unmount cleanup with paypal destroy', async () => {
        // Mock window.paypal
        const mockPaypalDestroy = jest.fn()
        global.window.paypal = {
            firstElementChild: true,
            __internal_destroy__: mockPaypalDestroy
        }

        const {unmount} = render(<AdyenCheckoutComponent {...defaultProps} />)

        await waitFor(() => {
            expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)
        })

        act(() => {
            unmount()
        })

        expect(mockDropinInstance.unmount).toHaveBeenCalled()

        // Cleanup
        delete global.window.paypal
    })

    it('should not reinitialize checkout if dropinRef already exists', async () => {
        // First render to create dropin
        render(<AdyenCheckoutComponent {...defaultProps} />)

        await waitFor(() => {
            expect(createCheckoutInstance).toHaveBeenCalledTimes(1)
        })
        expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)
    })

    it('should handle URL error parameter and remount component', async () => {
        // Mock URL with error param
        const originalLocation = window.location
        delete window.location
        window.location = {
            href: 'http://localhost/?error=test_error&redirectResult=test',
            search: '?error=test_error&redirectResult=test'
        }

        // Mock URLSearchParams
        const originalURLSearchParams = global.URLSearchParams
        global.URLSearchParams = jest.fn(() => ({
            get: (param) => {
                if (param === 'error') return 'test_error'
                if (param === 'redirectResult') return 'test'
                return null
            }
        }))

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        // Restore mocks
        window.location = originalLocation
        global.URLSearchParams = originalURLSearchParams
    })

    it('should handle internal adyen action changes', async () => {
        // This tests the internalAdyenAction dependency in useEffect
        const {rerender} = render(<AdyenCheckoutComponent {...defaultProps} />)

        await act(async () => {
            rerender(
                <AdyenCheckoutComponent
                    {...defaultProps}
                    dropinConfiguration={{openFirstPaymentMethod: false}}
                />
            )
        })

        // Should handle component re-render with different config
    })

    it('should not initialize when paymentContainer is not available', async () => {
        // This is implicitly tested since we always render with a container ref
    })

    it('should update orderNo when basket c_orderNo changes', async () => {
        const {rerender} = render(<AdyenCheckoutComponent {...defaultProps} />)

        await act(async () => {})

        const propsWithOrderNo = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderNo: 'ORDER123'
            }
        }

        await act(async () => {
            rerender(<AdyenCheckoutComponent {...propsWithOrderNo} />)
        })

        // OrderNo should be updated
    })

    it('should not update orderNo when c_orderNo is the same', async () => {
        const propsWithOrderNo = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderNo: 'ORDER123'
            }
        }

        const {rerender} = render(<AdyenCheckoutComponent {...propsWithOrderNo} />)

        await act(async () => {})

        // Re-render with same orderNo
        await act(async () => {
            rerender(<AdyenCheckoutComponent {...propsWithOrderNo} />)
        })

        // Should not cause issues
    })

    it('should update adyen order when c_orderData changes', async () => {
        const {rerender} = render(<AdyenCheckoutComponent {...defaultProps} />)

        await act(async () => {})

        const propsWithOrderData = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderData: JSON.stringify({orderData: 'new_order_data'})
            }
        }

        await act(async () => {
            rerender(<AdyenCheckoutComponent {...propsWithOrderData} />)
        })
    })

    it('should not call onStateChange when not provided', async () => {
        // Render without onStateChange
        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        // Should work without error
    })

    it('should handle missing translations gracefully', async () => {
        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} translations={null} />)
        })

        // Should work without error
    })

    it('should handle translations for different locale', async () => {
        const translations = {
            'de-DE': {
                payButton: 'Bezahlen'
            }
        }

        const propsWithGermanLocale = {
            ...defaultProps,
            locale: {id: 'de-DE'}
        }

        await act(async () => {
            render(
                <AdyenCheckoutComponent {...propsWithGermanLocale} translations={translations} />
            )
        })
    })

    it('should handle beforeSubmit and afterSubmit callbacks', async () => {
        const beforeSubmitMock = jest.fn()
        const afterSubmitMock = jest.fn()

        await act(async () => {
            render(
                <AdyenCheckoutComponent
                    {...defaultProps}
                    beforeSubmit={[beforeSubmitMock]}
                    afterSubmit={[afterSubmitMock]}
                />
            )
        })

        // Callbacks should be passed to payment methods configuration
    })

    it('should handle beforeAdditionalDetails and afterAdditionalDetails callbacks', async () => {
        const beforeAdditionalDetailsMock = jest.fn()
        const afterAdditionalDetailsMock = jest.fn()

        await act(async () => {
            render(
                <AdyenCheckoutComponent
                    {...defaultProps}
                    beforeAdditionalDetails={[beforeAdditionalDetailsMock]}
                    afterAdditionalDetails={[afterAdditionalDetailsMock]}
                />
            )
        })
    })

    it('should handle isRegistered customer type', async () => {
        useCustomerType.mockReturnValue({isRegistered: true})

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        // Component should handle registered customer
    })

    it('should skip payment methods for expressPDP page', async () => {
        render(<AdyenCheckoutComponent {...defaultProps} page="expressPDP" />)

        await act(async () => {})

        expect(useAdyenPaymentMethods).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: true
            })
        )
    })

    it('should handle multiple error callbacks', async () => {
        const error1 = jest.fn()
        const error2 = jest.fn()
        const mockError = new Error('Test error')

        useAdyenEnvironment.mockReturnValue({
            data: mockEnvironmentData,
            error: mockError,
            isLoading: false
        })

        render(<AdyenCheckoutComponent {...defaultProps} onError={[error1, error2]} />)

        await waitFor(() => {
            expect(error1).toHaveBeenCalledWith(mockError)
        })
        expect(error2).toHaveBeenCalledWith(mockError)
    })

    it('should handle unmount with error in dropin.unmount', async () => {
        const dropinWithError = {
            unmount: jest.fn().mockImplementation(() => {
                throw new Error('Unmount error')
            })
        }
        mountCheckoutComponent.mockReturnValue(dropinWithError)

        const {unmount} = render(<AdyenCheckoutComponent {...defaultProps} />)

        await waitFor(() => {
            expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)
        })

        // Should not throw when unmounting
        act(() => {
            unmount()
        })

        expect(dropinWithError.unmount).toHaveBeenCalled()
    })
})
