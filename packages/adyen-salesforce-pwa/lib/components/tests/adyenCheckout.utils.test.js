/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import {
    getCheckoutConfig,
    handleRedirects,
    mountCheckoutComponent
} from '../helpers/adyenCheckout.utils'
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

        const result = getCheckoutConfig(
            adyenEnvironment,
            adyenPaymentMethods,
            translations,
            locale
        )

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

describe('handleRedirects', () => {
    let checkoutMock
    let setIsLoadingMock

    beforeEach(() => {
        jest.clearAllMocks()
        checkoutMock = {
            submitDetails: jest.fn(),
            create: jest.fn().mockImplementation(() => ({
                mount: jest.fn().mockImplementation(() => ({
                    submit: jest.fn()
                }))
            }))
        }
        setIsLoadingMock = jest.fn()
    })

    it('handles redirectResult', () => {
        const result = handleRedirects('someRedirectResult', null, checkoutMock, setIsLoadingMock)
        expect(checkoutMock.submitDetails).toHaveBeenCalledWith({
            details: {redirectResult: 'someRedirectResult'}
        })
        expect(result).toBe(true)
    })

    it('handles amazonCheckoutSessionId', () => {
        const result = handleRedirects(
            null,
            'someAmazonCheckoutSessionId',
            checkoutMock,
            setIsLoadingMock
        )
        expect(setIsLoadingMock).toHaveBeenCalledWith(true)
        expect(checkoutMock.create).toHaveBeenCalledWith('amazonpay', {
            amazonCheckoutSessionId: 'someAmazonCheckoutSessionId',
            showOrderButton: false
        })
        expect(result).toBe(true)
    })

    it('returns false when no redirect parameters are present', () => {
        const result = handleRedirects(null, null, checkoutMock, setIsLoadingMock)
        expect(checkoutMock.submitDetails).not.toHaveBeenCalled()
        expect(checkoutMock.create).not.toHaveBeenCalled()
        expect(result).toBe(false)
    })
})

describe('mountCheckoutComponent', () => {
    let checkoutMock
    let paymentContainerMock
    let paymentMethodsConfigurationMock
    let optionalDropinConfigurationMock

    beforeEach(() => {
        jest.clearAllMocks()
        checkoutMock = {
            createFromAction: jest.fn().mockImplementation(() => ({
                mount: jest.fn()
            }))
        }
        paymentContainerMock = {current: document.createElement('div')}
        paymentMethodsConfigurationMock = {card: {}}
        optionalDropinConfigurationMock = {showPayButton: false}
    })

    it('handles adyenAction', () => {
        const adyenAction = btoa(JSON.stringify({some: 'actionData'}))
        mountCheckoutComponent(
            adyenAction,
            checkoutMock,
            paymentContainerMock,
            paymentMethodsConfigurationMock,
            optionalDropinConfigurationMock
        )
        expect(checkoutMock.createFromAction).toHaveBeenCalledWith({some: 'actionData'})
    })

    it('handles default case (mounts Dropin)', () => {
        mountCheckoutComponent(
            null,
            checkoutMock,
            paymentContainerMock,
            paymentMethodsConfigurationMock,
            optionalDropinConfigurationMock
        )
        expect(Dropin).toHaveBeenCalledWith(checkoutMock, {
            ...optionalDropinConfigurationMock,
            paymentMethodsConfiguration: paymentMethodsConfigurationMock,
            onSelect: expect.any(Function)
        })
        const mockDropinInstance = Dropin.mock.results[0].value
        expect(mockDropinInstance.mount).toHaveBeenCalledWith(paymentContainerMock.current)
    })
})
