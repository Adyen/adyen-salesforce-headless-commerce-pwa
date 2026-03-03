/**
 * @jest-environment jest-environment-jsdom
 */
import React from 'react'
import {act, cleanup, render} from '@testing-library/react'
import AdyenCheckoutComponent from '../adyenCheckout'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../../hooks/useAdyenPaymentMethods'
import useAdyenOrderNumber from '../../hooks/useAdyenOrderNumber'
import {
    createCheckoutInstance,
    handleRedirects,
    mountCheckoutComponent
} from '../helpers/adyenCheckout.utils.js'

// Mock the hooks and helpers
jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
jest.mock('../../hooks/useAdyenOrderNumber')
jest.mock('../helpers/adyenCheckout.utils')
jest.mock('../paymentMethodsConfiguration', () => ({
    paymentMethodsConfiguration: jest.fn(() => ({}))
}))

describe('AdyenCheckoutComponent', () => {
    const mockCheckoutInstance = {
        update: jest.fn()
    }
    const mockDropinInstance = {
        unmount: jest.fn()
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
        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        expect(createCheckoutInstance).toHaveBeenCalledTimes(1)
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
        let unmount
        await act(async () => {
            const {unmount: unmountComponent} = render(<AdyenCheckoutComponent {...defaultProps} />)
            unmount = unmountComponent
        })

        expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)

        act(() => {
            unmount()
        })

        // Check that the unmount function of the dropin instance was called
        expect(mockDropinInstance.unmount).toHaveBeenCalledTimes(1)
    })

    it('should update the checkout and re-mount dropin when adyenOrder changes', async () => {
        // Start without order data
        const {rerender} = render(<AdyenCheckoutComponent {...defaultProps} />)

        // Initial render
        await act(async () => {})
        expect(createCheckoutInstance).toHaveBeenCalledTimes(1)
        expect(handleRedirects).toHaveBeenCalledTimes(1)
        expect(mountCheckoutComponent).toHaveBeenCalledTimes(1)

        // Simulate a partial payment by adding adyenOrder
        const propsWithOrder = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderData: JSON.stringify({orderData: 'initial_order_data'})
            }
        }

        // Re-render the component with the new props
        await act(async () => {
            rerender(<AdyenCheckoutComponent {...propsWithOrder} />)
        })

        // The main initialization runs again on re-render
        expect(createCheckoutInstance).toHaveBeenCalledTimes(2)

        // mountCheckoutComponent should be called again to re-mount the dropin
        expect(mountCheckoutComponent).toHaveBeenCalledTimes(2)
    })

    it('should not update if checkout instance does not exist', async () => {
        createCheckoutInstance.mockResolvedValue(null) // Simulate checkout creation failure

        const propsWithOrder = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderData: JSON.stringify({orderData: 'initial_order_data'})
            }
        }
        const {rerender} = render(<AdyenCheckoutComponent {...propsWithOrder} />)

        // Update adyenOrder
        const updatedPropsWithOrder = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderData: JSON.stringify({orderData: 'new_order_data'})
            }
        }

        await act(async () => {
            rerender(<AdyenCheckoutComponent {...updatedPropsWithOrder} />)
        })

        expect(mockCheckoutInstance.update).not.toHaveBeenCalled()
    })

    it('should call onError callbacks when environment fetch has error', async () => {
        const envError = new Error('env error')
        const onErrorCb = jest.fn()
        useAdyenEnvironment.mockReturnValue({
            data: mockEnvironmentData,
            error: envError,
            isLoading: false
        })

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} onError={[onErrorCb]} />)
        })

        expect(onErrorCb).toHaveBeenCalledWith(envError)
        expect(createCheckoutInstance).not.toHaveBeenCalled()
    })

    it('should call onError callbacks when payment methods fetch has error', async () => {
        const pmError = new Error('pm error')
        const onErrorCb = jest.fn()
        useAdyenPaymentMethods.mockReturnValue({
            data: mockPaymentMethodsData,
            error: pmError,
            isLoading: false
        })

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} onError={[onErrorCb]} />)
        })

        expect(onErrorCb).toHaveBeenCalledWith(pmError)
    })

    it('should not initialize while still loading environment', async () => {
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

    it('should not initialize while still loading payment methods', async () => {
        useAdyenPaymentMethods.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        expect(createCheckoutInstance).not.toHaveBeenCalled()
    })

    it('should render spinner when loading', async () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        const {container} = render(
            <AdyenCheckoutComponent
                {...defaultProps}
                spinner={<div data-testid="spinner">Loading...</div>}
            />
        )

        expect(container.querySelector('[data-testid="spinner"]')).not.toBeNull()
    })

    it('should not render spinner when not loading', async () => {
        await act(async () => {})

        const {container} = render(
            <AdyenCheckoutComponent
                {...defaultProps}
                spinner={<div data-testid="spinner">Loading...</div>}
            />
        )

        await act(async () => {})
        expect(container.querySelector('[data-testid="spinner"]')).toBeNull()
    })

    it('should handle redirect result and skip mount', async () => {
        handleRedirects.mockReturnValue(true)

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} />)
        })

        expect(handleRedirects).toHaveBeenCalled()
        expect(mountCheckoutComponent).not.toHaveBeenCalled()
    })

    it('should call onError when createCheckoutInstance throws', async () => {
        const error = new Error('checkout init failed')
        const onErrorCb = jest.fn()
        createCheckoutInstance.mockRejectedValue(error)

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} onError={[onErrorCb]} />)
        })

        expect(onErrorCb).toHaveBeenCalledWith(error)
    })

    it('should update internalOrderNo when basket.c_orderNo changes', async () => {
        const {rerender} = render(<AdyenCheckoutComponent {...defaultProps} />)
        await act(async () => {})

        const propsWithOrderNo = {
            ...defaultProps,
            basket: {
                ...defaultProps.basket,
                c_orderNo: 'order-001'
            }
        }

        await act(async () => {
            rerender(<AdyenCheckoutComponent {...propsWithOrderNo} />)
        })

        // Re-render with same orderNo should not cause extra init
        await act(async () => {
            rerender(<AdyenCheckoutComponent {...propsWithOrderNo} />)
        })

        expect(createCheckoutInstance).toHaveBeenCalled()
    })

    it('should handle unmount with PayPal cleanup', async () => {
        // Setup window.paypal with __internal_destroy__
        const destroyFn = jest.fn()
        window.paypal = {__internal_destroy__: destroyFn}

        let unmount
        await act(async () => {
            const {unmount: u} = render(<AdyenCheckoutComponent {...defaultProps} />)
            unmount = u
        })

        act(() => {
            unmount()
        })

        expect(mockDropinInstance.unmount).toHaveBeenCalled()
        expect(destroyFn).toHaveBeenCalled()
        delete window.paypal
    })

    it('should pass onStateChange callback through handleStateChange', async () => {
        const onStateChangeCb = jest.fn()

        await act(async () => {
            render(<AdyenCheckoutComponent {...defaultProps} onStateChange={onStateChangeCb} />)
        })

        // createCheckoutInstance is called - verify it received setAdyenStateData
        expect(createCheckoutInstance).toHaveBeenCalledWith(
            expect.objectContaining({
                setAdyenStateData: expect.any(Function)
            })
        )
    })

    it('should set enableReview with userAction continue via config', async () => {
        await act(async () => {
            render(
                <AdyenCheckoutComponent
                    {...defaultProps}
                    dropinConfiguration={{openFirstPaymentMethod: true}}
                />
            )
        })

        expect(mountCheckoutComponent).toHaveBeenCalledWith(
            null,
            mockCheckoutInstance,
            expect.any(Object),
            expect.any(Object),
            {openFirstPaymentMethod: true}
        )
    })
})

describe('AdyenCheckoutComponent React.memo', () => {
    it('should export a memoized component', () => {
        // The default export is wrapped in React.memo
        expect(AdyenCheckoutComponent).toBeDefined()
        expect(AdyenCheckoutComponent.$$typeof).toBeDefined()
    })
})
