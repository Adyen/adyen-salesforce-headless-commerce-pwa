/**
 * @jest-environment jsdom
 */
import React from 'react'
import {renderHook} from '@testing-library/react'
import useAdyenCheckout from '../useAdyenCheckout'
import {AdyenCheckoutContext} from '../../contexts/adyen-checkout-context'

describe('useAdyenCheckout', () => {
    it('should return the context value from AdyenCheckoutContext', () => {
        const mockContextValue = {
            adyenPaymentMethods: {paymentMethods: [{type: 'scheme'}]},
            adyenEnvironment: {ADYEN_ENVIRONMENT: 'TEST'},
            isLoading: false,
            setIsLoading: jest.fn(),
            setAdyenStateData: jest.fn()
        }

        const wrapper = ({children}) => (
            <AdyenCheckoutContext.Provider value={mockContextValue}>
                {children}
            </AdyenCheckoutContext.Provider>
        )

        const {result} = renderHook(() => useAdyenCheckout(), {wrapper})

        expect(result.current).toBe(mockContextValue)
    })

    it('should return empty object when no provider is present', () => {
        const {result} = renderHook(() => useAdyenCheckout())

        expect(result.current).toEqual({})
    })
})
