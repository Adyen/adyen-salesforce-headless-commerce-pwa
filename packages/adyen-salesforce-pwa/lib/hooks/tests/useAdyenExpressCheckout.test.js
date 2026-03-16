/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook} from '@testing-library/react'
import useAdyenExpressCheckout from '../useAdyenExpressCheckout'
import {AdyenExpressCheckoutContext} from '../../contexts/adyen-express-checkout-context'

describe('useAdyenExpressCheckout', () => {
    it('should return the context value from AdyenExpressCheckoutContext', () => {
        const mockContextValue = {
            adyenEnvironment: {ADYEN_ENVIRONMENT: 'TEST'},
            adyenPaymentMethods: {paymentMethods: [{type: 'applepay'}]},
            basket: {basketId: 'basket-123'},
            navigate: jest.fn(),
            fetchShippingMethods: jest.fn()
        }

        const wrapper = ({children}) => (
            <AdyenExpressCheckoutContext.Provider value={mockContextValue}>
                {children}
            </AdyenExpressCheckoutContext.Provider>
        )

        const {result} = renderHook(() => useAdyenExpressCheckout(), {wrapper})

        expect(result.current).toBe(mockContextValue)
    })

    it('should return empty object when no provider is present', () => {
        const {result} = renderHook(() => useAdyenExpressCheckout())

        expect(result.current).toEqual({})
    })
})
