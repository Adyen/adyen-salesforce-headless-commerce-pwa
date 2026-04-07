/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {act, render, screen, waitFor} from '@testing-library/react'
import GooglePayExpressComponent from '../googlePayExpress'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../../hooks/useAdyenPaymentMethods'
import useAdyenShippingMethods from '../../hooks/useAdyenShippingMethods'
import {AdyenCheckout, GooglePay} from '@adyen/adyen-web'
import {getGooglePayExpressConfig} from '../googlepay/expressConfig'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'

jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
jest.mock('../../hooks/useAdyenShippingMethods')
jest.mock('../googlepay/expressConfig')
jest.mock('../../services/shipping-methods')
jest.mock('@salesforce/commerce-sdk-react')
jest.mock('@adyen/adyen-web', () => ({
    AdyenCheckout: jest.fn().mockResolvedValue({}),
    GooglePay: jest.fn().mockImplementation(() => ({
        isAvailable: jest.fn().mockResolvedValue(true),
        mount: jest.fn(),
        unmount: jest.fn()
    }))
}))

describe('GooglePayExpressComponent', () => {
    const defaultProps = {
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
        paymentMethods: [{type: 'googlepay'}],
        applicationInfo: {adyenLibrary: {name: 'test', version: '1.0.0'}}
    }

    const mockShippingMethodsData = {
        applicableShippingMethods: [{id: 'standard', name: 'Standard Shipping', price: 5.0}],
        defaultShippingMethodId: 'standard'
    }

    let mockGetShippingMethods
    let consoleErrorSpy

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        AdyenCheckout.mockResolvedValue({})

        useCustomerId.mockReturnValue('test-customer')
        useAccessToken.mockReturnValue({
            getTokenWhenReady: jest.fn().mockResolvedValue('test-auth-token')
        })

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

        useAdyenShippingMethods.mockReturnValue({
            data: mockShippingMethodsData,
            error: null,
            isLoading: false
        })

        mockGetShippingMethods = jest.fn().mockResolvedValue(mockShippingMethodsData)
        AdyenShippingMethodsService.mockImplementation(() => ({
            getShippingMethods: mockGetShippingMethods
        }))

        getGooglePayExpressConfig.mockReturnValue({
            showPayButton: true,
            isExpress: true
        })

        GooglePay.mockImplementation(() => ({
            isAvailable: jest.fn().mockResolvedValue(true),
            mount: jest.fn(),
            unmount: jest.fn()
        }))
    })

    afterEach(() => {
        jest.clearAllMocks()
        consoleErrorSpy.mockRestore()
    })

    describe('Rendering', () => {
        it('renders the Google Pay button container', () => {
            const {container} = render(<GooglePayExpressComponent {...defaultProps} />)
            expect(container.querySelector('div')).toBeInTheDocument()
        })

        it('renders spinner when environment is loading', () => {
            useAdyenEnvironment.mockReturnValue({data: null, error: null, isLoading: true})
            render(<GooglePayExpressComponent {...defaultProps} spinner={<div>Loading...</div>} />)
            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })

        it('renders spinner when payment methods are loading', () => {
            useAdyenPaymentMethods.mockReturnValue({data: null, error: null, isLoading: true})
            render(<GooglePayExpressComponent {...defaultProps} spinner={<div>Loading...</div>} />)
            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })

        it('renders spinner when shipping methods are loading', () => {
            useAdyenShippingMethods.mockReturnValue({data: null, error: null, isLoading: true})
            render(<GooglePayExpressComponent {...defaultProps} spinner={<div>Loading...</div>} />)
            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })

        it('does not render spinner when not loading', () => {
            render(<GooglePayExpressComponent {...defaultProps} spinner={<div>Loading...</div>} />)
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
        })
    })

    describe('Initialization', () => {
        it('initializes AdyenCheckout with correct configuration', async () => {
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(AdyenCheckout).toHaveBeenCalledWith({
                    environment: mockEnvironmentData.ADYEN_ENVIRONMENT,
                    clientKey: mockEnvironmentData.ADYEN_CLIENT_KEY,
                    countryCode: 'US',
                    locale: 'en-US',
                    analytics: {
                        analyticsData: {
                            applicationInfo: mockPaymentMethodsData.applicationInfo
                        }
                    }
                })
            })
        })

        it('calls getGooglePayExpressConfig with correct props', async () => {
            const onError = [jest.fn()]
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} onError={onError} />)
            })

            await waitFor(() => {
                expect(getGooglePayExpressConfig).toHaveBeenCalledWith(
                    expect.objectContaining({
                        token: 'test-auth-token',
                        customerId: 'test-customer',
                        basket: defaultProps.basket,
                        site: defaultProps.site,
                        locale: defaultProps.locale,
                        navigate: defaultProps.navigate,
                        onError,
                        fetchShippingMethods: expect.any(Function)
                    })
                )
            })
        })

        it('creates and mounts GooglePay button when available', async () => {
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(GooglePay).toHaveBeenCalled()
                const instance = GooglePay.mock.results[0].value
                expect(instance.isAvailable).toHaveBeenCalled()
                expect(instance.mount).toHaveBeenCalled()
            })
        })

        it('does not initialize when adyenEnvironment is missing', async () => {
            useAdyenEnvironment.mockReturnValue({data: null, error: null, isLoading: false})
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} />)
            })
            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('does not initialize when adyenPaymentMethods is missing', async () => {
            useAdyenPaymentMethods.mockReturnValue({data: null, error: null, isLoading: false})
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} />)
            })
            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('does not initialize when basket is missing', async () => {
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} basket={null} />)
            })
            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('does not initialize when googlepay method is not in payment methods', async () => {
            useAdyenPaymentMethods.mockReturnValue({
                data: {paymentMethods: [{type: 'scheme'}], applicationInfo: {}},
                error: null,
                isLoading: false
            })
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} />)
            })
            expect(AdyenCheckout).not.toHaveBeenCalled()
        })

        it('does not mount when Google Pay is not available', async () => {
            const mockInstance = {
                isAvailable: jest.fn().mockRejectedValue(new Error('Google Pay not available')),
                mount: jest.fn(),
                unmount: jest.fn()
            }
            GooglePay.mockImplementation(() => mockInstance)

            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} />)
            })
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 0))
            })

            expect(mockInstance.mount).not.toHaveBeenCalled()
        })
    })

    describe('Error handling', () => {
        it('calls onError callbacks when environment fetch fails', () => {
            const onError = [jest.fn(), jest.fn()]
            const error = new Error('Environment fetch failed')
            useAdyenEnvironment.mockReturnValue({data: null, error, isLoading: false})

            render(<GooglePayExpressComponent {...defaultProps} onError={onError} />)

            expect(onError[0]).toHaveBeenCalledWith(error)
            expect(onError[1]).toHaveBeenCalledWith(error)
        })

        it('calls onError callbacks when payment methods fetch fails', () => {
            const onError = [jest.fn()]
            const error = new Error('Payment methods fetch failed')
            useAdyenPaymentMethods.mockReturnValue({data: null, error, isLoading: false})

            render(<GooglePayExpressComponent {...defaultProps} onError={onError} />)

            expect(onError[0]).toHaveBeenCalledWith(error)
        })

        it('calls onError callbacks when shipping methods fetch fails', () => {
            const onError = [jest.fn()]
            const error = new Error('Shipping methods fetch failed')
            useAdyenShippingMethods.mockReturnValue({data: null, error, isLoading: false})

            render(<GooglePayExpressComponent {...defaultProps} onError={onError} />)

            expect(onError[0]).toHaveBeenCalledWith(error)
        })

        it('calls onError callbacks when initialization fails', async () => {
            const onError = [jest.fn()]
            const error = new Error('Initialization failed')
            AdyenCheckout.mockRejectedValue(error)

            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} onError={onError} />)
            })

            await waitFor(() => {
                expect(onError[0]).toHaveBeenCalledWith(error)
            })
        })
    })

    describe('Cleanup', () => {
        it('unmounts GooglePay button on component unmount', async () => {
            let unmount
            await act(async () => {
                const result = render(<GooglePayExpressComponent {...defaultProps} />)
                unmount = result.unmount
            })

            await waitFor(() => {
                expect(GooglePay).toHaveBeenCalled()
                expect(GooglePay.mock.results[0].value.mount).toHaveBeenCalled()
            })

            act(() => {
                unmount()
            })

            // The last mounted instance should be unmounted
            const lastInstance =
                GooglePay.mock.results[GooglePay.mock.results.length - 1].value
            expect(lastInstance.unmount).toHaveBeenCalled()
        })
    })

    describe('React.memo optimization', () => {
        it('does not re-render when unrelated props change', async () => {
            const {rerender} = await act(async () => {
                return render(<GooglePayExpressComponent {...defaultProps} />)
            })

            const initialCallCount = AdyenCheckout.mock.calls.length

            await act(async () => {
                rerender(
                    <GooglePayExpressComponent {...defaultProps} onError={[jest.fn()]} />
                )
            })

            expect(AdyenCheckout.mock.calls).toHaveLength(initialCallCount)
        })

        it('re-renders when basketId changes', async () => {
            const {rerender} = await act(async () => {
                return render(<GooglePayExpressComponent {...defaultProps} />)
            })

            await waitFor(() => {
                expect(AdyenCheckout).toHaveBeenCalled()
            })

            const initialCallCount = AdyenCheckout.mock.calls.length

            await act(async () => {
                rerender(
                    <GooglePayExpressComponent
                        {...defaultProps}
                        basket={{basketId: 'new-basket-id'}}
                    />
                )
            })

            await waitFor(() => {
                expect(AdyenCheckout.mock.calls.length).toBeGreaterThan(initialCallCount)
            })
        })
    })

    describe('fetchShippingMethods callback', () => {
        it('fetchShippingMethods calls AdyenShippingMethodsService with correct args', async () => {
            await act(async () => {
                render(<GooglePayExpressComponent {...defaultProps} />)
            })

            // Wait for the component to initialize with the real auth token
            await waitFor(() => {
                const calls = getGooglePayExpressConfig.mock.calls
                expect(calls.length).toBeGreaterThan(0)
                const lastCall = calls[calls.length - 1][0]
                expect(lastCall.token).toBe('test-auth-token')
            })

            const calls = getGooglePayExpressConfig.mock.calls
            const {fetchShippingMethods} = calls[calls.length - 1][0]
            expect(fetchShippingMethods).toBeDefined()

            const testBasketId = 'temp-basket-123'
            const result = await fetchShippingMethods(testBasketId)

            expect(AdyenShippingMethodsService).toHaveBeenCalledWith(
                'test-auth-token',
                'test-customer',
                testBasketId,
                defaultProps.site
            )
            expect(mockGetShippingMethods).toHaveBeenCalled()
            expect(result).toEqual(mockShippingMethodsData)
        })
    })
})
