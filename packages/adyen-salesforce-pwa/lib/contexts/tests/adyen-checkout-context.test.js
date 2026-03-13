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

    it('should provide setter functions in the context', async () => {
        const SetterConsumer = () => {
            const context = useContext(AdyenCheckoutContext)
            return (
                <div>
                    <span data-testid="has-setIsLoading">
                        {String(typeof context.setIsLoading === 'function')}
                    </span>
                    <span data-testid="has-setAdyenOrder">
                        {String(typeof context.setAdyenOrder === 'function')}
                    </span>
                    <span data-testid="has-setAdyenAction">
                        {String(typeof context.setAdyenAction === 'function')}
                    </span>
                    <span data-testid="has-setOrderNo">
                        {String(typeof context.setOrderNo === 'function')}
                    </span>
                    <span data-testid="has-setAdyenStateData">
                        {String(typeof context.setAdyenStateData === 'function')}
                    </span>
                    <span data-testid="has-getTranslations">
                        {String(typeof context.getTranslations === 'function')}
                    </span>
                    <span data-testid="has-getPaymentMethodsConfiguration">
                        {String(typeof context.getPaymentMethodsConfiguration === 'function')}
                    </span>
                </div>
            )
        }

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
                    <SetterConsumer />
                </AdyenCheckoutProvider>
            )
        })

        expect(screen.getByTestId('has-setIsLoading').textContent).toBe('true')
        expect(screen.getByTestId('has-setAdyenOrder').textContent).toBe('true')
        expect(screen.getByTestId('has-setAdyenAction').textContent).toBe('true')
        expect(screen.getByTestId('has-setOrderNo').textContent).toBe('true')
        expect(screen.getByTestId('has-setAdyenStateData').textContent).toBe('true')
        expect(screen.getByTestId('has-getTranslations').textContent).toBe('true')
        expect(screen.getByTestId('has-getPaymentMethodsConfiguration').textContent).toBe('true')
    })

    it('should dispatch setter calls and update context state', async () => {
        const DispatchConsumer = () => {
            const context = useContext(AdyenCheckoutContext)
            return (
                <div>
                    <span data-testid="isLoading">{String(context.isLoading)}</span>
                    <span data-testid="orderNo">{context.orderNo || 'null'}</span>
                    <button data-testid="setLoading" onClick={() => context.setIsLoading(true)}>
                        Load
                    </button>
                    <button data-testid="setOrder" onClick={() => context.setOrderNo('ORD-123')}>
                        Order
                    </button>
                    <button
                        data-testid="setAction"
                        onClick={() => context.setAdyenAction({type: 'redirect'})}
                    >
                        Action
                    </button>
                    <button
                        data-testid="setStateData"
                        onClick={() => context.setAdyenStateData({paymentMethod: {}})}
                    >
                        State
                    </button>
                </div>
            )
        }

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
                    <DispatchConsumer />
                </AdyenCheckoutProvider>
            )
        })

        expect(screen.getByTestId('isLoading').textContent).toBe('false')

        await act(async () => {
            screen.getByTestId('setLoading').click()
        })
        expect(screen.getByTestId('isLoading').textContent).toBe('true')

        await act(async () => {
            screen.getByTestId('setOrder').click()
        })
        expect(screen.getByTestId('orderNo').textContent).toBe('ORD-123')

        await act(async () => {
            screen.getByTestId('setAction').click()
        })

        await act(async () => {
            screen.getByTestId('setStateData').click()
        })
    })

    it('should parse c_orderData from basket and set adyenOrder', async () => {
        const providerProps = {
            authToken: 'testToken',
            customerId: 'customer123',
            locale: {id: 'en-US'},
            site: {id: 'RefArch'},
            page: 'checkout',
            basket: {
                basketId: 'b1',
                c_orderData: JSON.stringify({orderData: 'someData', remainingAmount: {value: 500}})
            }
        }

        await act(async () => {
            render(
                <AdyenCheckoutProvider {...providerProps}>
                    <TestConsumer />
                </AdyenCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context-value').textContent)
        expect(contextValue.adyenOrder).toEqual({
            orderData: 'someData',
            remainingAmount: {value: 500}
        })
    })

    it('should return translations when adyenConfig has matching locale translations', async () => {
        const TranslationsConsumer = () => {
            const context = useContext(AdyenCheckoutContext)
            const translations = context.getTranslations ? context.getTranslations() : null
            return <div data-testid="translations">{JSON.stringify(translations)}</div>
        }

        const providerProps = {
            authToken: 'testToken',
            customerId: 'customer123',
            locale: {id: 'en-US'},
            site: {id: 'RefArch'},
            page: 'checkout',
            adyenConfig: {
                translations: {'en-US': {payButton: 'Pay'}}
            }
        }

        await act(async () => {
            render(
                <AdyenCheckoutProvider {...providerProps}>
                    <TranslationsConsumer />
                </AdyenCheckoutProvider>
            )
        })

        const translations = JSON.parse(screen.getByTestId('translations').textContent)
        expect(translations).toEqual({'en-US': {payButton: 'Pay'}})
    })

    it('should return null for translations when locale does not match', async () => {
        const TranslationsConsumer = () => {
            const context = useContext(AdyenCheckoutContext)
            const translations = context.getTranslations ? context.getTranslations() : null
            return <div data-testid="translations">{JSON.stringify(translations)}</div>
        }

        const providerProps = {
            authToken: 'testToken',
            customerId: 'customer123',
            locale: {id: 'en-US'},
            site: {id: 'RefArch'},
            page: 'checkout',
            adyenConfig: {
                translations: {'de-DE': {payButton: 'Zahlen'}}
            }
        }

        await act(async () => {
            render(
                <AdyenCheckoutProvider {...providerProps}>
                    <TranslationsConsumer />
                </AdyenCheckoutProvider>
            )
        })

        const translations = JSON.parse(screen.getByTestId('translations').textContent)
        expect(translations).toBeNull()
    })

    it('should skip payment methods fetch when page is not checkout', async () => {
        const providerProps = {
            authToken: 'testToken',
            customerId: 'customer123',
            locale: {id: 'en-US'},
            site: {id: 'RefArch'},
            page: 'confirmation'
        }

        await act(async () => {
            render(
                <AdyenCheckoutProvider {...providerProps}>
                    <TestConsumer />
                </AdyenCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context-value').textContent)
        expect(contextValue.adyenPaymentMethods).toBeNull()
    })

    it('should handle adyenConfig being undefined', async () => {
        const providerProps = {
            authToken: 'testToken',
            customerId: 'customer123',
            locale: {id: 'en-US'},
            site: {id: 'RefArch'},
            page: 'checkout',
            adyenConfig: undefined
        }

        await act(async () => {
            render(
                <AdyenCheckoutProvider {...providerProps}>
                    <TestConsumer />
                </AdyenCheckoutProvider>
            )
        })

        const contextValue = JSON.parse(screen.getByTestId('context-value').textContent)
        expect(contextValue).toBeDefined()
    })

    it('should read redirectResult from URL params', async () => {
        const originalSearch = window.location.search
        Object.defineProperty(window, 'location', {
            value: {
                ...window.location,
                search: '?redirectResult=testRedirect&amazonCheckoutSessionId=amz123'
            },
            writable: true
        })

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
        expect(contextValue.redirectResult).toBe('testRedirect')
        expect(contextValue.amazonCheckoutSessionId).toBe('amz123')

        Object.defineProperty(window, 'location', {
            value: {...window.location, search: originalSearch},
            writable: true
        })
    })
})
