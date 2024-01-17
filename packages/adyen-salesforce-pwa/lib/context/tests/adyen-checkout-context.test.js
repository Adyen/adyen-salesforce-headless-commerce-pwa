/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React, {useEffect} from 'react'
import {AdyenCheckoutProvider, useAdyenCheckout} from '../adyen-checkout-context'
import AdyenCheckout from '../../components/adyenCheckout'
import {render} from '@testing-library/react'

let mockFetchPaymentMethods = jest.fn()
let mockFetchEnvironment = jest.fn()
let mockPaymentMethodsConfiguration = jest.fn()
let mockUseCurrentBasket = jest.fn()

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

// jest.mock('../../components/paymentMethodsConfiguration', () => ({
//     paymentMethodsConfiguration: mockPaymentMethodsConfiguration
// }))

describe('<AdyenCheckoutProvider />', () => {
    let useAccessToken, useCustomerId, useCustomerType, locationSpy
    beforeEach(() => {
        useAccessToken = jest.fn().mockImplementation(() => {
            return {
                getTokenWhenReady: jest.fn().mockImplementation(() => {
                    return 'mockToken'
                })
            }
        })
        useCustomerId = jest.fn().mockImplementation(() => {
            return 'mockCustomerId'
        })
        useCustomerType = jest.fn().mockImplementation(() => {
            return 'mockCustomerType'
        })
    })

    describe('when page is initialized', () => {
        it('render correct payment methods', async () => {
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
                        }
                    ]
                }
            })
            const TestingComponent = async () => {
                const {
                    adyenEnvironment,
                    adyenPaymentMethods,
                    adyenStateData,
                    adyenPaymentInProgress,
                    getPaymentMethodsConfiguration
                } = useAdyenCheckout()

                useEffect(() => {
                    // const paymentMethodsConfiguration = await getPaymentMethodsConfiguration({
                    //     onError: jest.fn()
                    // })
                }, [adyenEnvironment, adyenPaymentMethods])
                const paymentMethodsConfiguration = await getPaymentMethodsConfiguration({
                    onError: jest.fn()
                })
                return (
                    <>
                        <div id="adyenEnvironment">{adyenEnvironment}</div>
                        <div id="paymentMethodsConfiguration">{paymentMethodsConfiguration}</div>
                    </>
                )
            }
            let root
            const createNodeMock = () => {
                return <div></div>
            }
            // await act(() => {
            //     root = create(
            //         <AdyenCheckoutProvider
            //             useAccessToken={useAccessToken}
            //             useCustomerId={useCustomerId}
            //             useCustomerType={useCustomerType}
            //         >
            //             <AdyenCheckout />
            //         </AdyenCheckoutProvider>,
            //         {createNodeMock}
            //     )
            // })
            //
            // expect(root).toMatchSnapshot()
            render(
                <AdyenCheckoutProvider
                    useAccessToken={useAccessToken}
                    useCustomerId={useCustomerId}
                    useCustomerType={useCustomerType}
                >
                    <AdyenCheckout />
                </AdyenCheckoutProvider>
            )

            // render(<div>hello world</div>)
            expect(useAccessToken).toHaveBeenCalled()
            expect(useCustomerId).toHaveBeenCalled()
            expect(useCustomerType).toHaveBeenCalled()
            expect(mockFetchEnvironment).toHaveBeenCalled()
        })
    })
})
