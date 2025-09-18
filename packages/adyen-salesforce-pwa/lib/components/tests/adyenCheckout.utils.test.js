/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import {getCheckoutConfig, handleQueryParams} from '../helpers/adyenCheckout.utils'
import {Dropin} from '@adyen/adyen-web/auto'

jest.mock('@adyen/adyen-web/auto', () => ({
    ...jest.requireActual('@adyen/adyen-web/auto'),
    Dropin: jest.fn().mockImplementation(() => ({
        mount: jest.fn()
    }))
}))

describe('getCheckoutConfig', () => {
    it('returns correct checkout config without translations', () => {
        const adyenEnvironment = {
            ADYEN_ENVIRONMENT: 'test',
            ADYEN_CLIENT_KEY: 'test_client_key'
        }
        const adyenPaymentMethods = {
            paymentMethods: ['visa', 'mastercard']
        }
        const locale = {id: 'en_US'}

        const result = getCheckoutConfig(adyenEnvironment, adyenPaymentMethods, null, locale)

        expect(result).toEqual({
            environment: 'test',
            clientKey: 'test_client_key',
            paymentMethodsResponse: {
                paymentMethods: ['visa', 'mastercard']
            },
            countryCode: 'US'
        })
    })

    it('returns correct checkout config with translations', () => {
        const adyenEnvironment = {
            ADYEN_ENVIRONMENT: 'test',
            ADYEN_CLIENT_KEY: 'test_client_key'
        }
        const adyenPaymentMethods = {
            paymentMethods: ['visa', 'mastercard']
        }
        const translations = {
            'creditCard.holderName.placeholder': 'John Smith'
        }
        const locale = {id: 'en_US'}

        const result = getCheckoutConfig(adyenEnvironment, adyenPaymentMethods, translations, locale)

        expect(result).toEqual({
            environment: 'test',
            clientKey: 'test_client_key',
            paymentMethodsResponse: {
                paymentMethods: ['visa', 'mastercard']
            },
            countryCode: 'US',
            locale: 'en_US',
            translations: translations
        })
    })
})

describe('handleQueryParams', () => {
    let urlParamsMock
    let checkoutMock
    let setAdyenPaymentInProgressMock
    let paymentContainerMock
    let paymentMethodsConfigurationMock

    beforeEach(() => {
        jest.clearAllMocks()
        urlParamsMock = new URLSearchParams()
        checkoutMock = {
            submitDetails: jest.fn(),
            create: jest.fn().mockImplementation(() => ({
                mount: jest.fn().mockImplementation(() => ({
                    submit: jest.fn()
                }))
            })),
            createFromAction: jest.fn().mockImplementation(() => ({
                mount: jest.fn()
            }))
        }
        setAdyenPaymentInProgressMock = jest.fn()
        paymentContainerMock = {current: document.createElement('div')}
        paymentMethodsConfigurationMock = {card: {}}
    })

    it('handles redirectResult', () => {
        urlParamsMock.set('redirectResult', 'someRedirectResult')
        handleQueryParams(
            urlParamsMock,
            checkoutMock,
            setAdyenPaymentInProgressMock,
            paymentContainerMock,
            paymentMethodsConfigurationMock
        )
        expect(checkoutMock.submitDetails).toHaveBeenCalledWith({
            data: {details: {redirectResult: 'someRedirectResult'}}
        })
    })

    it('handles amazonCheckoutSessionId', () => {
        urlParamsMock.set('amazonCheckoutSessionId', 'someAmazonCheckoutSessionId')
        handleQueryParams(
            urlParamsMock,
            checkoutMock,
            setAdyenPaymentInProgressMock,
            paymentContainerMock,
            paymentMethodsConfigurationMock
        )
        expect(setAdyenPaymentInProgressMock).toHaveBeenCalledWith(true)
        expect(checkoutMock.create).toHaveBeenCalledWith('amazonpay', {
            amazonCheckoutSessionId: 'someAmazonCheckoutSessionId',
            showOrderButton: false
        })
    })

    it('handles adyenAction', () => {
        const adyenAction = btoa(JSON.stringify({some: 'actionData'}))
        urlParamsMock.set('adyenAction', adyenAction)
        handleQueryParams(
            urlParamsMock,
            checkoutMock,
            setAdyenPaymentInProgressMock,
            paymentContainerMock,
            paymentMethodsConfigurationMock
        )
        expect(checkoutMock.createFromAction).toHaveBeenCalled()
    })

    it('handles default case (mounts Dropin)', () => {
        handleQueryParams(
            urlParamsMock,
            checkoutMock,
            setAdyenPaymentInProgressMock,
            paymentContainerMock,
            paymentMethodsConfigurationMock
        )
        expect(Dropin).toHaveBeenCalledWith(checkoutMock, {
            paymentMethodsConfiguration: paymentMethodsConfigurationMock
        })
        const mockDropinInstance = Dropin.mock.results[0].value
        expect(mockDropinInstance.mount).toHaveBeenCalledWith(paymentContainerMock.current)
    })
})
