/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {act, render, screen, waitFor} from '@testing-library/react'
import PayPalExpressComponent from '../paypalExpress'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../../hooks/useAdyenPaymentMethods'
import {AdyenCheckout, PayPal} from '@adyen/adyen-web'
import {paypalExpressConfig} from '../paypal/expressConfig'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'

jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
jest.mock('../paypal/expressConfig')
jest.mock('../../services/shipping-methods')
jest.mock('@adyen/adyen-web', () => ({
    AdyenCheckout: jest.fn().mockResolvedValue({}),
    PayPal: jest.fn().mockImplementation(() => ({
        isAvailable: jest.fn().mockResolvedValue(true),
        mount: jest.fn(),
        unmount: jest.fn()
    }))
}))

describe('PayPalExpressComponent', () => {
    const defaultProps = {
        authToken: 'test-auth-token',
        customerId: 'test-customer',
        locale: {id: 'en-US'},
        site: {id: 'test-site'},
        basket: {basketId: 'test-basket'},
        navigate: jest.fn()
    }

    const mockEnvironmentData = {
        ADYEN_ENVIRONMENT: 'test',
        ADYEN_CLIENT_KEY: 'test_client_key'
    }

    const mockPaymentMethodsData = {
        paymentMethods: [{type: 'paypal'}],
        applicationInfo: {
            adyenLibrary: {name: 'test', version: '1.0.0'}
        }
    }

    const mockShippingMethodsData = {
        applicableShippingMethods: [{id: 'standard', name: 'Standard Shipping', price: 5.0}],
        defaultShippingMethodId: 'standard'
    }

    let mockGetShippingMethods

    beforeEach(() => {
        // Reset window.paypal
        delete window.paypal

        // Mock hooks
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

        // Mock shipping methods service
        mockGetShippingMethods = jest.fn().mockResolvedValue(mockShippingMethodsData)
        AdyenShippingMethodsService.mockImplementation(() => ({
            getShippingMethods: mockGetShippingMethods
        }))

        // Mock paypalExpressConfig
        paypalExpressConfig.mockReturnValue({
            showPayButton: true,
            isExpress: true
        })

        // Reset PayPal mock to default implementation
        PayPal.mockImplementation(() => ({
            isAvailable: jest.fn().mockResolvedValue(true),
            mount: jest.fn(),
            unmount: jest.fn()
        }))
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Rendering', () => {
        it('renders the PayPal button container', () => {
            render(<PayPalExpressComponent {...defaultProps} />)
            const container = document.querySelector('.adyen-paypal-express-button-container')
            expect(container).toBeInTheDocument()
        })

        it('renders spinner when environment is loading', () => {
            useAdyenEnvironment.mockReturnValue({
                data: null,
                error: null,
                isLoading: true
            })

            render(<PayPalExpressComponent {...defaultProps} spinner={<div>Loading...</div>} />)
            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })

        it('renders spinner when payment methods are loading', () => {
            useAdyenPaymentMethods.mockReturnValue({
                data: null,
                error: null,
                isLoading: true
            })

            render(<PayPalExpressComponent {...defaultProps} spinner={<div>Loading...</div>} />)
            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })

        it('does not render spinner when not loading', () => {
            render(<PayPalExpressComponent {...defaultProps} spinner={<div>Loading...</div>} />)
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
        })
    })

    describe('Initialization', () => {
        it('initializes AdyenCheckout with correct configuration', async () => {
            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(AdyenCheckout).toHaveBeenCalledWith({
                    environment: mockEnvironmentData.ADYEN_ENVIRONMENT,
                    clientKey: mockEnvironmentData.ADYEN_CLIENT_KEY,
                    countryCode: 'US',
                    locale: 'en-US',
                    paymentMethodsResponse: mockPaymentMethodsData,
                    analytics: {
                        analyticsData: {
                            applicationInfo: mockPaymentMethodsData.applicationInfo
                        }
                    }
                })
            })
        })

        it('calls paypalExpressConfig with correct props', async () => {
            const beforeSubmit = [jest.fn()]
            const afterSubmit = [jest.fn()]
            const onError = [jest.fn()]

            await act(async () => {
                render(
                    <PayPalExpressComponent
                        {...defaultProps}
                        beforeSubmit={beforeSubmit}
                        afterSubmit={afterSubmit}
                        onError={onError}
                    />
                )
            })

            await waitFor(() => {
                expect(paypalExpressConfig).toHaveBeenCalledWith(
                    expect.objectContaining({
                        token: defaultProps.authToken,
                        customerId: defaultProps.customerId,
                        basket: defaultProps.basket,
                        site: defaultProps.site,
                        locale: defaultProps.locale,
                        navigate: defaultProps.navigate,
                        beforeSubmit,
                        afterSubmit,
                        onError,
                        fetchShippingMethods: expect.any(Function)
                    })
                )
            })
        })

        it('creates and mounts PayPal button when available', async () => {
            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(PayPal).toHaveBeenCalled()
                const mockPayPalInstance = PayPal.mock.results[0].value
                expect(mockPayPalInstance.isAvailable).toHaveBeenCalled()
                expect(mockPayPalInstance.mount).toHaveBeenCalled()
            })
        })

        it('does not initialize when adyenEnvironment is missing', async () => {
            useAdyenEnvironment.mockReturnValue({
                data: null,
                error: null,
                isLoading: false
            })

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('does not initialize when adyenPaymentMethods is missing', async () => {
            useAdyenPaymentMethods.mockReturnValue({
                data: null,
                error: null,
                isLoading: false
            })

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('does not initialize when basket is missing', async () => {
            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} basket={null} />)
            })

            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('does not initialize when PayPal method is not available', async () => {
            useAdyenPaymentMethods.mockReturnValue({
                data: {
                    paymentMethods: [{type: 'scheme'}],
                    applicationInfo: {}
                },
                error: null,
                isLoading: false
            })

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('mounts PayPal button without isAvailable check if method does not exist', async () => {
            const mockPayPalInstance = {
                mount: jest.fn(),
                unmount: jest.fn()
            }
            PayPal.mockImplementation(() => mockPayPalInstance)

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(mockPayPalInstance.mount).toHaveBeenCalled()
            })
        })

        it('does not mount if PayPal is not available', async () => {
            const mockPayPalInstance = {
                isAvailable: jest.fn().mockRejectedValue(new Error('PayPal not available')),
                mount: jest.fn(),
                unmount: jest.fn()
            }
            PayPal.mockImplementation(() => mockPayPalInstance)

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 0))
            })

            expect(mockPayPalInstance.mount).not.toHaveBeenCalled()
        })
    })

    describe('fetchShippingMethods callback', () => {
        it('creates fetchShippingMethods callback with correct parameters', async () => {
            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(paypalExpressConfig).toHaveBeenCalled()
            })

            const configCall = paypalExpressConfig.mock.calls[0][0]
            expect(configCall.fetchShippingMethods).toBeDefined()
            expect(typeof configCall.fetchShippingMethods).toBe('function')
        })

        it('fetchShippingMethods calls AdyenShippingMethodsService', async () => {
            let fetchShippingMethodsCallback

            paypalExpressConfig.mockImplementation((props) => {
                fetchShippingMethodsCallback = props.fetchShippingMethods
                return {showPayButton: true, isExpress: true}
            })

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(fetchShippingMethodsCallback).toBeDefined()
            })

            const result = await fetchShippingMethodsCallback()

            expect(AdyenShippingMethodsService).toHaveBeenCalledWith(
                defaultProps.authToken,
                defaultProps.customerId,
                defaultProps.basket.basketId,
                defaultProps.site
            )
            expect(mockGetShippingMethods).toHaveBeenCalled()
            expect(result).toEqual(mockShippingMethodsData)
        })
    })

    describe('Error handling', () => {
        it('calls onError callbacks when environment fetch fails', () => {
            const onError = [jest.fn(), jest.fn()]
            const error = new Error('Environment fetch failed')

            useAdyenEnvironment.mockReturnValue({
                data: null,
                error,
                isLoading: false
            })

            render(<PayPalExpressComponent {...defaultProps} onError={onError} />)

            expect(onError[0]).toHaveBeenCalledWith(error)
            expect(onError[1]).toHaveBeenCalledWith(error)
        })

        it('calls onError callbacks when payment methods fetch fails', () => {
            const onError = [jest.fn(), jest.fn()]
            const error = new Error('Payment methods fetch failed')

            useAdyenPaymentMethods.mockReturnValue({
                data: null,
                error,
                isLoading: false
            })

            render(<PayPalExpressComponent {...defaultProps} onError={onError} />)

            expect(onError[0]).toHaveBeenCalledWith(error)
            expect(onError[1]).toHaveBeenCalledWith(error)
        })

        it('calls onError callbacks when initialization fails', async () => {
            const onError = [jest.fn()]
            const error = new Error('Initialization failed')

            AdyenCheckout.mockRejectedValue(error)

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} onError={onError} />)
            })

            await waitFor(() => {
                expect(onError[0]).toHaveBeenCalledWith(error)
            })
        })
    })

    describe('Cleanup', () => {
        it('clears window.paypal if it has firstElementChild on mount', async () => {
            window.paypal = {
                firstElementChild: document.createElement('div')
            }

            await act(async () => {
                render(<PayPalExpressComponent {...defaultProps} />)
            })

            expect(window.paypal).toBeUndefined()
        })
    })

    describe('React.memo optimization', () => {
        it('does not re-render when unrelated props change', async () => {
            const {rerender} = await act(async () => {
                return render(<PayPalExpressComponent {...defaultProps} />)
            })

            const initialCallCount = AdyenCheckout.mock.calls.length

            await act(async () => {
                rerender(
                    <PayPalExpressComponent
                        {...defaultProps}
                        beforeSubmit={[jest.fn()]} // This should not trigger re-render due to memo
                    />
                )
            })

            // AdyenCheckout should not be called again
            expect(AdyenCheckout.mock.calls).toHaveLength(initialCallCount)
        })

        it('re-renders when basketId changes', async () => {
            const {rerender} = await act(async () => {
                return render(<PayPalExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(AdyenCheckout).toHaveBeenCalled()
            })

            const initialCallCount = AdyenCheckout.mock.calls.length

            await act(async () => {
                rerender(
                    <PayPalExpressComponent
                        {...defaultProps}
                        basket={{basketId: 'new-basket-id'}}
                    />
                )
            })

            // Should trigger re-initialization
            await waitFor(() => {
                expect(AdyenCheckout.mock.calls.length).toBeGreaterThan(initialCallCount)
            })
        })
    })
})
