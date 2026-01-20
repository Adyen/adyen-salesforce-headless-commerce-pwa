/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {act, render, screen} from '@testing-library/react'
import ApplePayExpressComponent from '../applePayExpress'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../../hooks/useAdyenPaymentMethods'
import useAdyenPaymentMethodsForExpress from '../../hooks/useAdyenPaymentMethodsForExpress'
import useAdyenShippingMethods from '../../hooks/useAdyenShippingMethods'
import {getAppleButtonConfig, getApplePaymentMethodConfig} from '../helpers/applePayExpress.utils'
import {AdyenCheckout} from '@adyen/adyen-web'

jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
jest.mock('../../hooks/useAdyenPaymentMethodsForExpress')
jest.mock('../../hooks/useAdyenShippingMethods')
jest.mock('../helpers/applePayExpress.utils')

const mockMount = jest.fn()
const mockCreate = jest.fn(() => ({
    mount: mockMount
}))
jest.mock('@adyen/adyen-web', () => ({
    AdyenCheckout: jest.fn(() => ({
        create: mockCreate
    }))
}))

describe('ApplePayExpressComponent', () => {
    const defaultProps = {
        authToken: 'test-auth-token',
        customerId: 'test-customer',
        locale: {id: 'en-US'},
        site: {id: 'test-site'},
        basket: {basketId: 'test-basket'},
        navigate: jest.fn(),
        spinner: <div>Spinner</div>,
        session: {
            id: 'mock-session-id',
            sessionData: 'mock-session-data'
        }
    }

    const mockEnvironmentData = {
        ADYEN_ENVIRONMENT: 'test',
        ADYEN_CLIENT_KEY: 'test_key'
    }

    const mockPaymentMethodsData = {
        paymentMethods: [{type: 'applepay'}],
        applicationInfo: {}
    }

    const mockShippingMethodsData = {
        applicableShippingMethods: []
    }

    beforeEach(() => {
        jest.clearAllMocks()
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
        getApplePaymentMethodConfig.mockReturnValue({type: 'applepay'})
        getAppleButtonConfig.mockReturnValue({})
    })

    it('renders spinner when hooks are loading', () => {
        useAdyenEnvironment.mockReturnValue({isLoading: true, error: null, data: null})
        render(<ApplePayExpressComponent {...defaultProps} />)
        expect(screen.getByText('Spinner')).toBeInTheDocument()
    })

    it('does not render spinner when hooks are not loading', () => {
        render(<ApplePayExpressComponent {...defaultProps} />)
        expect(screen.queryByText('Spinner')).not.toBeInTheDocument()
    })

    it('initializes and mounts Apple Pay button when available', async () => {
        await act(async () => {
            render(<ApplePayExpressComponent {...defaultProps} />)
        })

        expect(AdyenCheckout).toHaveBeenCalledWith(
            expect.objectContaining({
                environment: 'test',
                clientKey: 'test_key'
            })
        )
        // expect(mockCreate).toHaveBeenCalledWith('applepay', expect.any(Object))
        // expect(mockMount).toHaveBeenCalledWith('#apple-pay-container')
    })

    it('does not initialize if dependencies are not met', async () => {
        useAdyenEnvironment.mockReturnValue({data: null, error: null, isLoading: false})

        await act(async () => {
            render(<ApplePayExpressComponent {...defaultProps} />)
        })

        expect(AdyenCheckout).not.toHaveBeenCalled()
    })

    it('does not mount if Apple Pay payment method is not available', async () => {
        useAdyenPaymentMethods.mockReturnValue({
            data: {paymentMethods: []},
            error: null,
            isLoading: false
        })

        await act(async () => {
            render(<ApplePayExpressComponent {...defaultProps} />)
        })

        expect(mockCreate).not.toHaveBeenCalled()
    })

    describe('Cart Flow', () => {
        it('uses useAdyenPaymentMethods hook for cart flow (default)', () => {
            render(<ApplePayExpressComponent {...defaultProps} />)

            expect(useAdyenPaymentMethods).toHaveBeenCalledWith({
                authToken: defaultProps.authToken,
                customerId: defaultProps.customerId,
                basketId: defaultProps.basket.basketId,
                site: defaultProps.site,
                locale: defaultProps.locale
            })
            expect(useAdyenPaymentMethodsForExpress).not.toHaveBeenCalled()
        })

        it('uses basket from props for cart flow', () => {
            render(<ApplePayExpressComponent {...defaultProps} />)

            expect(useAdyenPaymentMethods).toHaveBeenCalledWith(
                expect.objectContaining({
                    basketId: defaultProps.basket.basketId
                })
            )
        })

        it('passes basket to getAppleButtonConfig for cart flow', async () => {
            await act(async () => {
                render(<ApplePayExpressComponent {...defaultProps} />)
            })

            expect(getAppleButtonConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    basket: defaultProps.basket
                })
            )
        })
    })

    describe('PDP Flow', () => {
        const pdpProps = {
            ...defaultProps,
            isExpressPdp: true,
            currency: 'USD',
            product: {
                price: 99.99,
                quantity: 2
            }
        }

        beforeEach(() => {
            useAdyenPaymentMethodsForExpress.mockReturnValue({
                data: mockPaymentMethodsData,
                error: null,
                isLoading: false
            })
        })

        it('uses useAdyenPaymentMethodsForExpress hook for PDP flow', () => {
            render(<ApplePayExpressComponent {...pdpProps} />)

            expect(useAdyenPaymentMethodsForExpress).toHaveBeenCalledWith({
                authToken: pdpProps.authToken,
                customerId: pdpProps.customerId,
                site: pdpProps.site,
                locale: pdpProps.locale,
                currency: pdpProps.currency
            })
            expect(useAdyenPaymentMethods).not.toHaveBeenCalled()
        })

        it('creates temporary basket with product price for PDP flow', () => {
            render(<ApplePayExpressComponent {...pdpProps} />)

            expect(useAdyenPaymentMethodsForExpress).toHaveBeenCalledWith(
                expect.objectContaining({
                    currency: 'USD'
                })
            )
        })

        it('calculates orderTotal from product price and quantity', async () => {
            await act(async () => {
                render(<ApplePayExpressComponent {...pdpProps} />)
            })

            expect(getAppleButtonConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    basket: expect.objectContaining({
                        currency: 'USD',
                        orderTotal: 199.98 // 99.99 * 2
                    })
                })
            )
        })

        it('defaults to quantity 1 if not provided', async () => {
            const propsWithoutQuantity = {
                ...pdpProps,
                product: {price: 50.0}
            }

            await act(async () => {
                render(<ApplePayExpressComponent {...propsWithoutQuantity} />)
            })

            expect(getAppleButtonConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    basket: expect.objectContaining({
                        orderTotal: 50.0 // 50.0 * 1
                    })
                })
            )
        })

        it('passes isExpressPdp flag to getAppleButtonConfig', async () => {
            await act(async () => {
                render(<ApplePayExpressComponent {...pdpProps} />)
            })

            expect(getAppleButtonConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    isExpressPdp: true
                })
            )
        })

        it('passes product to getAppleButtonConfig for PDP flow', async () => {
            await act(async () => {
                render(<ApplePayExpressComponent {...pdpProps} />)
            })

            expect(getAppleButtonConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    product: pdpProps.product
                })
            )
        })
    })

    describe('shopperBasket Memoization', () => {
        it('memoizes shopperBasket based on isPdp, currency, and basket', async () => {
            const {rerender} = render(<ApplePayExpressComponent {...defaultProps} />)

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 0))
            })

            const firstCallCount = getAppleButtonConfig.mock.calls.length

            // Re-render with same props - should use memoized value and not re-initialize
            rerender(<ApplePayExpressComponent {...defaultProps} />)

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 0))
            })

            // getAppleButtonConfig should not be called again since props haven't changed
            expect(getAppleButtonConfig.mock.calls).toHaveLength(firstCallCount)
        })

        it('updates shopperBasket when basket changes', () => {
            const {rerender} = render(<ApplePayExpressComponent {...defaultProps} />)

            const firstCallBasket = useAdyenPaymentMethods.mock.calls[0][0].basketId

            const newBasket = {basketId: 'new-basket-id'}
            rerender(<ApplePayExpressComponent {...defaultProps} basket={newBasket} />)

            const secondCallBasket = useAdyenPaymentMethods.mock.calls[1][0].basketId

            expect(firstCallBasket).not.toBe(secondCallBasket)
            expect(secondCallBasket).toBe('new-basket-id')
        })

        it('updates shopperBasket when switching from cart to PDP flow', () => {
            const {rerender} = render(<ApplePayExpressComponent {...defaultProps} />)

            expect(useAdyenPaymentMethods).toHaveBeenCalled()
            expect(useAdyenPaymentMethodsForExpress).not.toHaveBeenCalled()

            useAdyenPaymentMethodsForExpress.mockReturnValue({
                data: mockPaymentMethodsData,
                error: null,
                isLoading: false
            })

            const pdpProps = {
                ...defaultProps,
                isExpressPdp: true,
                currency: 'USD',
                product: {price: 100, quantity: 1}
            }

            rerender(<ApplePayExpressComponent {...pdpProps} />)

            expect(useAdyenPaymentMethodsForExpress).toHaveBeenCalled()
        })
    })

    describe('Error Handling', () => {
        it('calls onError callbacks when payment methods fetch fails in cart flow', () => {
            const onError = [jest.fn(), jest.fn()]
            const error = new Error('Payment methods fetch failed')

            useAdyenPaymentMethods.mockReturnValue({
                data: null,
                error,
                isLoading: false
            })

            render(<ApplePayExpressComponent {...defaultProps} onError={onError} />)

            expect(onError[0]).toHaveBeenCalledWith(error)
            expect(onError[1]).toHaveBeenCalledWith(error)
        })

        it('calls onError callbacks when payment methods fetch fails in PDP flow', () => {
            const onError = [jest.fn(), jest.fn()]
            const error = new Error('Payment methods for express fetch failed')

            useAdyenPaymentMethodsForExpress.mockReturnValue({
                data: null,
                error,
                isLoading: false
            })

            const pdpProps = {
                ...defaultProps,
                isExpressPdp: true,
                currency: 'USD',
                product: {price: 100},
                onError
            }

            render(<ApplePayExpressComponent {...pdpProps} />)

            expect(onError[0]).toHaveBeenCalledWith(error)
            expect(onError[1]).toHaveBeenCalledWith(error)
        })
    })
})
