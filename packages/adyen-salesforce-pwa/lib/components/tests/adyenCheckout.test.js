/**
 * @jest-environment jest-environment-jsdom
 */
import React from 'react'
import {render, act, cleanup} from '@testing-library/react'
import AdyenCheckoutComponent from '../adyenCheckout'
import useAdyenCheckout from '../../hooks/useAdyenCheckout'
import {createCheckoutInstance, handleQueryParams} from '../helpers/adyenCheckout.utils'

// Mock the hook and helpers
jest.mock('../../hooks/useAdyenCheckout')
jest.mock('../helpers/adyenCheckout.utils')

describe('AdyenCheckoutComponent', () => {
    let mockUseAdyenCheckout
    const mockCheckoutInstance = {
        update: jest.fn()
    }
    const mockDropinInstance = {
        unmount: jest.fn()
    }

    beforeEach(() => {
        jest.clearAllMocks()

        // Default mock implementation for the hook
        mockUseAdyenCheckout = {
            adyenEnvironment: {clientKey: 'test_key', environment: 'test'},
            adyenPaymentMethods: {paymentMethods: [{type: 'scheme'}]},
            adyenOrder: null,
            optionalDropinConfiguration: {},
            getPaymentMethodsConfiguration: jest.fn().mockResolvedValue({}),
            adyenPaymentInProgress: false,
            setAdyenPaymentInProgress: jest.fn(),
            getTranslations: jest.fn(),
            locale: 'en-US',
            setAdyenStateData: jest.fn(),
            orderNo: '123',
            navigate: jest.fn()
        }
        useAdyenCheckout.mockReturnValue(mockUseAdyenCheckout)

        // Mock helpers
        createCheckoutInstance.mockResolvedValue(mockCheckoutInstance)
        handleQueryParams.mockReturnValue(mockDropinInstance)
    })

    afterEach(() => {
        cleanup()
    })

    it('should initialize checkout when environment and payment methods are available', async () => {
        await act(async () => {
            render(<AdyenCheckoutComponent />)
        })

        expect(createCheckoutInstance).toHaveBeenCalledTimes(1)
        expect(handleQueryParams).toHaveBeenCalledTimes(1)
    })

    it('should not initialize checkout if adyenEnvironment is not available', async () => {
        useAdyenCheckout.mockReturnValue({...mockUseAdyenCheckout, adyenEnvironment: null})

        await act(async () => {
            render(<AdyenCheckoutComponent />)
        })

        expect(createCheckoutInstance).not.toHaveBeenCalled()
        expect(handleQueryParams).not.toHaveBeenCalled()
    })

    it('should not initialize checkout if adyenPaymentInProgress is true', async () => {
        useAdyenCheckout.mockReturnValue({...mockUseAdyenCheckout, adyenPaymentInProgress: true})

        await act(async () => {
            render(<AdyenCheckoutComponent />)
        })

        expect(createCheckoutInstance).not.toHaveBeenCalled()
        expect(handleQueryParams).not.toHaveBeenCalled()
    })

    it('should call the cleanup function on unmount', async () => {
        let unmount
        await act(async () => {
            const {unmount: unmountComponent} = render(<AdyenCheckoutComponent />)
            unmount = unmountComponent
        })

        expect(handleQueryParams).toHaveBeenCalledTimes(1)

        act(() => {
            unmount()
        })

        // Check that the unmount function of the dropin instance was called
        expect(mockDropinInstance.unmount).toHaveBeenCalledTimes(1)
    })

    it('should update the checkout and re-mount dropin when adyenOrder changes', async () => {
        const {rerender} = render(<AdyenCheckoutComponent />)

        // Initial render
        await act(async () => {})
        expect(createCheckoutInstance).toHaveBeenCalledTimes(1)
        expect(handleQueryParams).toHaveBeenCalledTimes(1)
        expect(mockCheckoutInstance.update).not.toHaveBeenCalled()

        // Simulate a partial payment by updating the adyenOrder
        const newAdyenOrder = {orderData: 'new_order_data'}
        useAdyenCheckout.mockReturnValue({
            ...mockUseAdyenCheckout,
            adyenOrder: newAdyenOrder
        })

        // Re-render the component with the new props
        await act(async () => {
            rerender(<AdyenCheckoutComponent />)
        })

        // The main initialization should NOT run again
        expect(createCheckoutInstance).toHaveBeenCalledTimes(1)

        // The update logic should run
        expect(mockCheckoutInstance.update).toHaveBeenCalledWith({order: newAdyenOrder})
        expect(mockDropinInstance.unmount).toHaveBeenCalledTimes(1)

        // handleQueryParams should be called again to re-mount the dropin
        expect(handleQueryParams).toHaveBeenCalledTimes(2)
    })

    it('should not update if checkout instance does not exist', async () => {
        createCheckoutInstance.mockResolvedValue(null) // Simulate checkout creation failure

        const {rerender} = render(<AdyenCheckoutComponent />)

        // Update adyenOrder
        useAdyenCheckout.mockReturnValue({
            ...mockUseAdyenCheckout,
            adyenOrder: {orderData: 'new_order_data'}
        })

        await act(async () => {
            rerender(<AdyenCheckoutComponent />)
        })

        expect(mockCheckoutInstance.update).not.toHaveBeenCalled()
    })
})