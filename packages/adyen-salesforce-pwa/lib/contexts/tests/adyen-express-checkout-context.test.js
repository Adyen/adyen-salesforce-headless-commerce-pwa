/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React, {useContext} from 'react'
import {act, render, screen} from '@testing-library/react'
import {
    AdyenExpressCheckoutContext,
    AdyenExpressCheckoutProvider
} from '../adyen-express-checkout-context'
import {AdyenPaymentMethodsService} from '../../services/payment-methods'
import {AdyenEnvironmentService} from '../../services/environment'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'

jest.mock('../../services/payment-methods')
jest.mock('../../services/environment')
jest.mock('../../services/shipping-methods')

const mockPaymentMethodsResponse = {paymentMethods: ['visa']}
const mockEnvironmentResponse = {clientKey: 'test_key'}
const mockShippingMethodsResponse = {shippingMethods: ['standard']}
const mockGetShippingMethods = jest.fn().mockResolvedValue(mockShippingMethodsResponse)

// A simple consumer component to access the context value
const TestConsumer = () => {
    const context = useContext(AdyenExpressCheckoutContext)
    // The context value contains functions, which can't be serialized directly.
    // We'll just render the stateful parts.
    const {adyenEnvironment, adyenPaymentMethods, shippingMethods} = context
    return (
        <div data-testid="context">
            {JSON.stringify({adyenEnvironment, adyenPaymentMethods, shippingMethods})}
        </div>
    )
}

describe('AdyenExpressCheckoutProvider', () => {
    let consoleErrorSpy
    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
        // Reset mocks before each test
        AdyenPaymentMethodsService.mockClear()
        AdyenEnvironmentService.mockClear()
        AdyenShippingMethodsService.mockClear()
        mockGetShippingMethods.mockClear()

        // Setup mock implementations
        AdyenEnvironmentService.mockImplementation(() => ({
            fetchEnvironment: jest.fn().mockResolvedValue(mockEnvironmentResponse)
        }))
        AdyenPaymentMethodsService.mockImplementation(() => ({
            fetchPaymentMethods: jest.fn().mockResolvedValue(mockPaymentMethodsResponse)
        }))
        AdyenShippingMethodsService.mockImplementation(() => ({
            getShippingMethods: mockGetShippingMethods
        }))
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('fetches environment and payment methods on mount', async () => {
        await act(async () => {
            render(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    locale={{id: 'en-US'}}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context').textContent)

        expect(AdyenEnvironmentService).toHaveBeenCalled()
        expect(AdyenPaymentMethodsService).toHaveBeenCalled()
        expect(contextValue.adyenEnvironment).toEqual(mockEnvironmentResponse)
        expect(contextValue.adyenPaymentMethods).toEqual(mockPaymentMethodsResponse)
    })

    it('fetches shipping methods automatically when basketId is available', async () => {
        const mockBasket = {basketId: 'mockBasket'}

        await act(async () => {
            render(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    basket={mockBasket}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context').textContent)
        expect(AdyenShippingMethodsService).toHaveBeenCalled()
        expect(contextValue.shippingMethods).toEqual(mockShippingMethodsResponse)
    })

    it('exposes a working fetchShippingMethods function that can be called manually', async () => {
        let context
        const ManualFetchConsumer = () => {
            context = useContext(AdyenExpressCheckoutContext)
            return <button onClick={context.fetchShippingMethods}>Fetch Manually</button>
        }

        await act(async () => {
            render(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    basket={{basketId: 'mockBasket'}}
                    navigate={jest.fn()}
                >
                    <ManualFetchConsumer />
                </AdyenExpressCheckoutProvider>
            )
        })

        // It's called once automatically on mount because basketId is present
        expect(mockGetShippingMethods).toHaveBeenCalledTimes(1)
    })

    it('handles errors during data fetching and sets error state', async () => {
        // Override mock to simulate an error
        AdyenEnvironmentService.mockImplementation(() => ({
            fetchEnvironment: jest.fn().mockRejectedValue(new Error('API Error'))
        }))

        await act(async () => {
            render(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    locale={{id: 'en-US'}}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context').textContent)
        expect(contextValue.adyenEnvironment).toEqual({error: {}})
    })
})
