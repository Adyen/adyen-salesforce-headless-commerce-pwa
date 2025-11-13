/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React, {useContext} from 'react'
import {act, render, screen} from '@testing-library/react'
import AdyenCheckoutProvider, {AdyenCheckoutContext} from '../adyen-checkout-context'
import {AdyenPaymentMethodsService} from '../../services/payment-methods'
import {AdyenEnvironmentService} from '../../services/environment'

// Mock the services and the component that consumes the context
jest.mock('../../services/payment-methods')
jest.mock('../../services/environment')
jest.mock('../../components/adyenCheckout', () => <div data-testid="adyen-checkout-mock"></div>)

// A simple consumer component to get the context value
const TestConsumer = () => {
    const context = useContext(AdyenCheckoutContext)
    return <div data-testid="context-value">{JSON.stringify(context)}</div>
}

describe('AdyenCheckoutProvider', () => {
    const mockPaymentMethodsResponse = {
        paymentMethods: [{name: 'Cards', type: 'scheme'}]
    }
    const mockEnvironmentResponse = {
        ADYEN_ENVIRONMENT: 'test',
        ADYEN_CLIENT_KEY: 'testKey'
    }

    beforeEach(() => {
        // Reset mocks
        AdyenPaymentMethodsService.mockClear()
        AdyenEnvironmentService.mockClear()

        // Mock implementations
        AdyenEnvironmentService.mockImplementation(() => ({
            fetchEnvironment: jest.fn().mockResolvedValue(mockEnvironmentResponse)
        }))
        AdyenPaymentMethodsService.mockImplementation(() => ({
            fetchPaymentMethods: jest.fn().mockResolvedValue(mockPaymentMethodsResponse)
        }))
    })

    it('fetches environment and payment methods and provides them in the context', async () => {
        const providerProps = {
            authToken: 'testToken',
            customerId: 'customer123',
            locale: {id: 'en-US'},
            site: {id: 'RefArch'},
            page: 'checkout'
        }

        await act(async () => {
            render(
                <AdyenCheckoutProvider {...providerProps}>
                    <TestConsumer />
                </AdyenCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context-value').textContent)
        expect(AdyenEnvironmentService).toHaveBeenCalled()
        expect(AdyenPaymentMethodsService).toHaveBeenCalled()

        expect(contextValue.adyenEnvironment).toEqual(mockEnvironmentResponse)
        expect(contextValue.adyenPaymentMethods).toEqual(mockPaymentMethodsResponse)
    })

    it('handles errors during data fetching', async () => {
        // Simulate an error
        AdyenEnvironmentService.mockImplementation(() => ({
            fetchEnvironment: jest.fn().mockRejectedValue(new Error('API Error'))
        }))

        const providerProps = {
            authToken: 'testToken',
            customerId: 'customer123',
            locale: {id: 'en-US'},
            site: {id: 'RefArch'},
            page: 'checkout'
        }

        await act(async () => {
            render(
                <AdyenCheckoutProvider {...providerProps}>
                    <TestConsumer />
                </AdyenCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context-value').textContent)
        expect(contextValue.adyenEnvironment).toEqual({error: {}})
    })
})
