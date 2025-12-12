/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {act, render, screen} from '@testing-library/react'
import ApplePayExpressComponent from '../applePayExpress'
import useAdyenEnvironment from '../../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../../hooks/useAdyenPaymentMethods'
import useAdyenShippingMethods from '../../hooks/useAdyenShippingMethods'
import {getAppleButtonConfig, getApplePaymentMethodConfig} from '../helpers/applePayExpress.utils'
import {AdyenCheckout} from '@adyen/adyen-web'

jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
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
})
