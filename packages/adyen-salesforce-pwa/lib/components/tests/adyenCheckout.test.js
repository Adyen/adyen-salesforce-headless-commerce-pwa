/**
 * @jest-environment jest-environment-jsdom
 */
import React from 'react'
import {act, cleanup, render} from '@testing-library/react'
import AdyenCheckoutComponent from '../adyenCheckout'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../../hooks/useAdyenPaymentMethods'
import {
    createCheckoutInstance,
    handleRedirects,
    mountCheckoutComponent
} from '../helpers/adyenCheckout.utils.js'

// Mock the hooks and helpers
jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
jest.mock('../helpers/adyenCheckout.utils')

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
})
