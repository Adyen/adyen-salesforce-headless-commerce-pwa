/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {act, render, screen} from '@testing-library/react'
import ApplePayExpressComponent from '../applePayExpress'
import useAdyenExpressCheckout from '../../hooks/useAdyenExpressCheckout'
import {getAppleButtonConfig, getApplePaymentMethodConfig} from '../helpers/applePayExpress.utils'
import {AdyenCheckout, ApplePay} from '@adyen/adyen-web'

jest.mock('../../hooks/useAdyenExpressCheckout')
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
    let mockUseAdyenExpressCheckout

    beforeEach(() => {
        mockUseAdyenExpressCheckout = {
            adyenEnvironment: {ADYEN_ENVIRONMENT: 'test', ADYEN_CLIENT_KEY: 'test_key'},
            adyenPaymentMethods: {paymentMethods: []},
            basket: {basketId: 'test-basket'},
            locale: {id: 'en-US'},
            site: {id: 'test-site'},
            authToken: 'test-auth-token',
            navigate: jest.fn(),
            shippingMethods: {applicableShippingMethods: []},
            fetchShippingMethods: jest.fn()
        }
        useAdyenExpressCheckout.mockReturnValue(mockUseAdyenExpressCheckout)
        getApplePaymentMethodConfig.mockReturnValue({})
        getAppleButtonConfig.mockReturnValue({})
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders spinner when showLoading is true', () => {
        render(<ApplePayExpressComponent showLoading={true} spinner={<div>Spinner</div>} />)
        expect(screen.getByText('Spinner')).toBeInTheDocument()
    })

    it('does not render spinner when showLoading is false', () => {
        render(<ApplePayExpressComponent showLoading={false} spinner={<div>Spinner</div>} />)
        expect(screen.queryByText('Spinner')).not.toBeInTheDocument()
    })

    it('initializes and mounts Apple Pay button when available', async () => {
        await act(async () => {
            render(<ApplePayExpressComponent />)
        })

        expect(AdyenCheckout).toHaveBeenCalled()
        expect(getApplePaymentMethodConfig).toHaveBeenCalledWith(
            mockUseAdyenExpressCheckout.adyenPaymentMethods
        )
        expect(getAppleButtonConfig).toHaveBeenCalled()
        expect(ApplePay).toHaveBeenCalled()
        const mockApplePayInstance = ApplePay.mock.results[0].value
        expect(mockApplePayInstance.isAvailable).toHaveBeenCalled()
        expect(mockApplePayInstance.mount).toHaveBeenCalled()
    })

    it('does not initialize if dependencies are not met', async () => {
        useAdyenExpressCheckout.mockReturnValue({
            ...mockUseAdyenExpressCheckout,
            adyenEnvironment: null
        })

        await act(async () => {
            render(<ApplePayExpressComponent />)
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
            render(<ApplePayExpressComponent />)
        })

        expect(mockApplePayInstance.mount).not.toHaveBeenCalled()
    })
})
