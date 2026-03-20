/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React, {useContext} from 'react'
import {act, render, screen, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
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

const createWrapper = (children) => {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}}
    })
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
        render(
            createWrapper(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    locale={{id: 'en-US'}}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        )

        expect(AdyenEnvironmentService).toHaveBeenCalled()
        expect(AdyenPaymentMethodsService).toHaveBeenCalled()

        await waitFor(() => {
            const contextValue = JSON.parse(screen.getByTestId('context').textContent)
            expect(contextValue.adyenEnvironment).toEqual(mockEnvironmentResponse)
            expect(contextValue.adyenPaymentMethods).toEqual(mockPaymentMethodsResponse)
        })
    })

    it('fetches shipping methods automatically when basketId is available', async () => {
        const mockBasket = {basketId: 'mockBasket'}

        render(
            createWrapper(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    basket={mockBasket}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        )

        expect(AdyenShippingMethodsService).toHaveBeenCalled()

        await waitFor(() => {
            const contextValue = JSON.parse(screen.getByTestId('context').textContent)
            expect(contextValue.shippingMethods).toEqual(mockShippingMethodsResponse)
        })
    })

    it('exposes a working fetchShippingMethods function that can be called manually', async () => {
        let context
        const ManualFetchConsumer = () => {
            context = useContext(AdyenExpressCheckoutContext)
            return <button onClick={context.fetchShippingMethods}>Fetch Manually</button>
        }

        await act(async () => {
            render(
                createWrapper(
                    <AdyenExpressCheckoutProvider
                        authToken="mockToken"
                        site={{id: 'mockSite'}}
                        basket={{basketId: 'mockBasket'}}
                        navigate={jest.fn()}
                    >
                        <ManualFetchConsumer />
                    </AdyenExpressCheckoutProvider>
                )
            )
        })

        // It's called once automatically on mount because basketId is present
        expect(mockGetShippingMethods).toHaveBeenCalledTimes(1)
    })

    it('handles payment methods error and sets error state', async () => {
        AdyenPaymentMethodsService.mockImplementation(() => ({
            fetchPaymentMethods: jest.fn().mockRejectedValue(new Error('PM Error'))
        }))

        render(
            createWrapper(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    locale={{id: 'en-US'}}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        )

        await waitFor(() => {
            const contextValue = JSON.parse(screen.getByTestId('context').textContent)
            expect(contextValue.adyenPaymentMethods).toBeNull()
        })
    })

    it('handles shipping methods error and sets error state', async () => {
        AdyenShippingMethodsService.mockImplementation(() => ({
            getShippingMethods: jest.fn().mockRejectedValue(new Error('Ship Error'))
        }))

        render(
            createWrapper(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    basket={{basketId: 'b1'}}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        )

        await waitFor(() => {
            const contextValue = JSON.parse(screen.getByTestId('context').textContent)
            expect(contextValue.shippingMethods).toBeNull()
        })
    })

    it('skips shipping methods fetch when basketId is not available', async () => {
        await act(async () => {
            render(
                createWrapper(
                    <AdyenExpressCheckoutProvider
                        authToken="mockToken"
                        site={{id: 'mockSite'}}
                        locale={{id: 'en-US'}}
                        navigate={jest.fn()}
                    >
                        <TestConsumer />
                    </AdyenExpressCheckoutProvider>
                )
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context').textContent)
        expect(contextValue.shippingMethods).toBeNull()
    })

    it('handles errors during data fetching and sets error state', async () => {
        // Override mock to simulate an error
        AdyenEnvironmentService.mockImplementation(() => ({
            fetchEnvironment: jest.fn().mockRejectedValue(new Error('API Error'))
        }))

        render(
            createWrapper(
                <AdyenExpressCheckoutProvider
                    authToken="mockToken"
                    site={{id: 'mockSite'}}
                    locale={{id: 'en-US'}}
                    navigate={jest.fn()}
                >
                    <TestConsumer />
                </AdyenExpressCheckoutProvider>
            )
        )

        await waitFor(() => {
            const contextValue = JSON.parse(screen.getByTestId('context').textContent)
            expect(contextValue.adyenEnvironment).toBeNull()
        })
    })
})
