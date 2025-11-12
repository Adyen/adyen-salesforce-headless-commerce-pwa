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
import {AdyenCheckout, ApplePay} from '@adyen/adyen-web'

jest.mock('../../hooks/useAdyenEnvironment')
jest.mock('../../hooks/useAdyenPaymentMethods')
jest.mock('../../hooks/useAdyenShippingMethods')
jest.mock('../helpers/applePayExpress.utils')
jest.mock('@adyen/adyen-web', () => ({
    AdyenCheckout: jest.fn().mockResolvedValue({}),
    ApplePay: jest.fn().mockImplementation(() => ({
        isAvailable: jest.fn().mockResolvedValue(true),
        mount: jest.fn(),
        unmount: jest.fn()
    }))
}))

describe('ApplePayExpressComponent', () => {
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
        ADYEN_CLIENT_KEY: 'test_key'
    }

    const mockPaymentMethodsData = {
        paymentMethods: [],
        applicationInfo: {}
    }

    const mockShippingMethodsData = {
        applicableShippingMethods: []
    }

    beforeEach(() => {
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

        getApplePaymentMethodConfig.mockReturnValue({})
        getAppleButtonConfig.mockReturnValue({})
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders spinner when hooks are loading', () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: true
        })

        render(<ApplePayExpressComponent {...defaultProps} spinner={<div>Spinner</div>} />)
        expect(screen.getByText('Spinner')).toBeInTheDocument()
    })

    it('does not render spinner when hooks are not loading', () => {
        render(<ApplePayExpressComponent {...defaultProps} spinner={<div>Spinner</div>} />)
        expect(screen.queryByText('Spinner')).not.toBeInTheDocument()
    })

    it('initializes and mounts Apple Pay button when available', async () => {
        await act(async () => {
            render(<ApplePayExpressComponent {...defaultProps} />)
        })

        expect(AdyenCheckout).toHaveBeenCalled()
        expect(getApplePaymentMethodConfig).toHaveBeenCalledWith(mockPaymentMethodsData)
        expect(getAppleButtonConfig).toHaveBeenCalled()
        expect(ApplePay).toHaveBeenCalled()
        const mockApplePayInstance = ApplePay.mock.results[0].value
        expect(mockApplePayInstance.isAvailable).toHaveBeenCalled()
        expect(mockApplePayInstance.mount).toHaveBeenCalled()
    })

    it('does not initialize if dependencies are not met', async () => {
        useAdyenEnvironment.mockReturnValue({
            data: null,
            error: null,
            isLoading: false
        })

        await act(async () => {
            render(<ApplePayExpressComponent {...defaultProps} />)
        })

        expect(AdyenCheckout).not.toHaveBeenCalled()
    })

    it('does not mount if Apple Pay is not available', async () => {
        const mockApplePayInstance = {
            isAvailable: jest.fn().mockResolvedValue(false),
            mount: jest.fn()
        }
        ApplePay.mockImplementation(() => mockApplePayInstance)

        await act(async () => {
            render(<ApplePayExpressComponent {...defaultProps} />)
        })

        expect(mockApplePayInstance.mount).not.toHaveBeenCalled()
    })
})
