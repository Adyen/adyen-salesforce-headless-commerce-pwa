/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {render, screen} from '@testing-library/react'
import AdyenCheckoutComponent from '../adyenCheckout'
import useAdyenCheckout from '../../hooks/useAdyenCheckout'
import {createCheckoutInstance, handleQueryParams} from '../adyenCheckout.utils'

jest.mock('../../hooks/useAdyenCheckout')
jest.mock('../adyenCheckout.utils', () => ({
    createCheckoutInstance: jest.fn(),
    handleQueryParams: jest.fn()
}))

describe('AdyenCheckoutComponent', () => {
    let mockUseAdyenCheckout

    beforeEach(() => {
        mockUseAdyenCheckout = {
            adyenEnvironment: {ADYEN_ENVIRONMENT: 'test', ADYEN_CLIENT_KEY: 'test_key'},
            adyenPaymentMethods: {paymentMethods: []},
            adyenOrder: null,
            checkoutDropin: null,
            setCheckoutDropin: jest.fn(),
            getPaymentMethodsConfiguration: jest.fn().mockResolvedValue({}),
            adyenPaymentInProgress: false,
            setAdyenPaymentInProgress: jest.fn(),
            getTranslations: jest.fn().mockReturnValue({}),
            locale: {id: 'en-US'},
            setAdyenStateData: jest.fn(),
            orderNo: '123',
            navigate: jest.fn()
        }
        useAdyenCheckout.mockReturnValue(mockUseAdyenCheckout)
        createCheckoutInstance.mockResolvedValue({})
        handleQueryParams.mockReturnValue({})
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders spinner when showLoading is true', () => {
        render(<AdyenCheckoutComponent showLoading={true} spinner={<div>Spinner</div>} />)
        expect(screen.getByText('Spinner')).toBeInTheDocument()
    })

    it('does not render spinner when showLoading is false', () => {
        render(<AdyenCheckoutComponent showLoading={false} spinner={<div>Spinner</div>} />)
        expect(screen.queryByText('Spinner')).not.toBeInTheDocument()
    })

    it('initializes checkout on mount', async () => {
        render(<AdyenCheckoutComponent />)
        // Wait for the useEffect to run
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(mockUseAdyenCheckout.getPaymentMethodsConfiguration).toHaveBeenCalled()
        expect(createCheckoutInstance).toHaveBeenCalled()
        expect(handleQueryParams).toHaveBeenCalled()
    })
})
