/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import AdyenCheckoutProvider from '../adyen-checkout-context'
import AdyenCheckout from '../../components/adyenCheckout'
import {render, screen} from '@testing-library/react'

let mockFetchPaymentMethods = jest.fn()
let mockFetchEnvironment = jest.fn()

jest.mock('@salesforce/retail-react-app/app/hooks/use-current-basket', () => {
    return {
        useCurrentBasket: jest.fn().mockImplementation(() => ({
            data: {
                orderTotal: 100,
                productTotal: 100,
                currency: 'USD',
                basketId: 'test123'
            }
        }))
    }
})
jest.mock('react-router-dom', () => {
    return {
        useLocation: jest.fn().mockImplementation(() => {
            return {
                pathname: 'testPath',
                search: 'testSearch'
            }
        })
    }
})
jest.mock('@salesforce/retail-react-app/app/utils/site-utils', () => {
    return {
        resolveLocaleFromUrl: jest.fn().mockImplementation(() => {
            return 'en-US'
        })
    }
})
jest.mock('@salesforce/retail-react-app/app/hooks/use-navigation', () => {
    return () => jest.fn()
})
jest.mock('../../services/payment-methods', () => ({
    AdyenPaymentMethodsService: jest.fn().mockImplementation(() => ({
        fetchPaymentMethods: mockFetchPaymentMethods
    }))
}))

jest.mock('../../services/environment', () => ({
    AdyenEnvironmentService: jest.fn().mockImplementation(() => ({
        fetchEnvironment: mockFetchEnvironment
    }))
}))

describe('<AdyenCheckoutProvider />', () => {
    let authToken, customerId, customerType, locale, site, locationSpy, setAdyenPaymentInProgress
    beforeEach(() => {
        authToken = 'testToken'
        customerId = 'customer123'
        customerType = 'guest'
        locale = 'en-US'
        site = 'RefArch'

        setAdyenPaymentInProgress = jest.fn().mockImplementation(() => {
            return 'success'
        })

        mockFetchEnvironment.mockImplementationOnce(() => ({
            ADYEN_ENVIRONMENT: 'test',
            ADYEN_CLIENT_KEY: 'testKey'
        }))
        mockFetchPaymentMethods.mockImplementationOnce(() => {
            return {
                paymentMethods: [
                    {
                        details: [
                            {
                                key: 'encryptedCardNumber',
                                type: 'cardToken'
                            },
                            {
                                key: 'encryptedSecurityCode',
                                type: 'cardToken'
                            },
                            {
                                key: 'encryptedExpiryMonth',
                                type: 'cardToken'
                            },
                            {
                                key: 'encryptedExpiryYear',
                                type: 'cardToken'
                            },
                            {
                                key: 'holderName',
                                optional: true,
                                type: 'text'
                            }
                        ],
                        name: 'Cards',
                        type: 'scheme'
                    },
                    {
                        name: 'Amazon Pay',
                        type: 'amazonpay'
                    }
                ]
            }
        })
    })

    describe('when page is initialized', () => {
        it('render correct payment methods', async () => {
            const wrapper = ({children}) => (
                <AdyenCheckoutProvider
                    authToken={authToken}
                    customerId={customerId}
                    customerType={customerType}
                    locale={locale}
                    site={site}
                >
                    {children}
                </AdyenCheckoutProvider>
            )
            render(<AdyenCheckout />, {wrapper})
            expect(await screen.findByText('Cards')).toBeInTheDocument()
            expect(mockFetchEnvironment).toHaveBeenCalled()
        })
    })
})
