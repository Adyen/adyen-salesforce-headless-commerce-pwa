/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import {
    getCheckoutConfig,
    handleRedirects,
    mountCheckoutComponent,
    createCheckoutInstance
} from '../helpers/adyenCheckout.utils'
import {Dropin} from '@adyen/adyen-web/auto'

const mockAdyenCheckout = jest.fn()

jest.mock('@adyen/adyen-web/auto', () => ({
    AdyenCheckout: (...args) => mockAdyenCheckout(...args),
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
            paymentMethodsConfiguration: paymentMethodsConfigurationMock
        })
        const mockDropinInstance = Dropin.mock.results[0].value
        expect(mockDropinInstance.mount).toHaveBeenCalledWith(paymentContainerMock.current)
    })
})

describe('createCheckoutInstance', () => {
    let mockCheckoutObj
    let defaultParams

    beforeEach(() => {
        jest.clearAllMocks()
        mockCheckoutObj = {mock: 'checkout'}
        mockAdyenCheckout.mockResolvedValue(mockCheckoutObj)
        defaultParams = {
            paymentMethodsConfiguration: {
                onSubmit: jest.fn(),
                onAdditionalDetails: jest.fn(),
                onError: jest.fn(),
                onOrderCancel: jest.fn()
            },
            adyenEnvironment: {
                ADYEN_ENVIRONMENT: 'test',
                ADYEN_CLIENT_KEY: 'test_key'
            },
            adyenPaymentMethods: {paymentMethods: [{type: 'scheme'}]},
            adyenOrder: null,
            getTranslations: jest.fn().mockReturnValue(null),
            locale: {id: 'en_US'},
            setAdyenStateData: jest.fn(),
            setIsLoading: jest.fn()
        }
    })

    it('should call AdyenCheckout with the correct config and return the instance', async () => {
        const result = await createCheckoutInstance(defaultParams)

        expect(mockAdyenCheckout).toHaveBeenCalledWith(
            expect.objectContaining({
                environment: 'test',
                clientKey: 'test_key',
                countryCode: 'US',
                order: null
            })
        )
        expect(result).toBe(mockCheckoutObj)
    })

    it('should call onSubmit handler and manage loading state', async () => {
        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        const mockState = {data: {}}
        const mockElement = {}
        const mockActions = {}

        await callArgs.onSubmit(mockState, mockElement, mockActions)

        expect(defaultParams.setIsLoading).toHaveBeenCalledWith(true)
        expect(defaultParams.paymentMethodsConfiguration.onSubmit).toHaveBeenCalledWith(
            mockState,
            mockElement,
            mockActions
        )
        expect(defaultParams.setIsLoading).toHaveBeenCalledWith(false)
    })

    it('should call card onSubmit if top-level onSubmit is missing', async () => {
        const cardOnSubmit = jest.fn()
        defaultParams.paymentMethodsConfiguration = {
            card: {onSubmit: cardOnSubmit}
        }

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        await callArgs.onSubmit({}, {}, {})

        expect(defaultParams.setIsLoading).toHaveBeenCalledWith(true)
        expect(cardOnSubmit).toHaveBeenCalled()
        expect(defaultParams.setIsLoading).toHaveBeenCalledWith(false)
    })

    it('should set loading to false even when onSubmit throws', async () => {
        defaultParams.paymentMethodsConfiguration.onSubmit.mockRejectedValue(
            new Error('submit error')
        )

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        await expect(callArgs.onSubmit({}, {}, {})).rejects.toThrow('submit error')
        expect(defaultParams.setIsLoading).toHaveBeenCalledWith(false)
    })

    it('should not call setIsLoading if no onSubmit handler exists', async () => {
        defaultParams.paymentMethodsConfiguration = {}

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        await callArgs.onSubmit({}, {}, {})

        expect(defaultParams.setIsLoading).not.toHaveBeenCalled()
    })

    it('should call onAdditionalDetails handler and manage loading state', async () => {
        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        await callArgs.onAdditionalDetails({}, {}, {})

        expect(defaultParams.setIsLoading).toHaveBeenCalledWith(true)
        expect(defaultParams.paymentMethodsConfiguration.onAdditionalDetails).toHaveBeenCalled()
        expect(defaultParams.setIsLoading).toHaveBeenCalledWith(false)
    })

    it('should call card onAdditionalDetails if top-level is missing', async () => {
        const cardOnAdditionalDetails = jest.fn()
        defaultParams.paymentMethodsConfiguration = {
            card: {onAdditionalDetails: cardOnAdditionalDetails}
        }

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        await callArgs.onAdditionalDetails({}, {}, {})

        expect(cardOnAdditionalDetails).toHaveBeenCalled()
    })

    it('should call setAdyenStateData on valid onChange', async () => {
        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        callArgs.onChange({isValid: true, data: {paymentMethod: {type: 'scheme'}}})

        expect(defaultParams.setAdyenStateData).toHaveBeenCalledWith({
            paymentMethod: {type: 'scheme'}
        })
    })

    it('should not call setAdyenStateData on invalid onChange', async () => {
        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        callArgs.onChange({isValid: false, data: {}})

        expect(defaultParams.setAdyenStateData).not.toHaveBeenCalled()
    })

    it('should call onError handler', async () => {
        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        const mockError = {message: 'test error'}
        callArgs.onError(mockError)

        expect(defaultParams.paymentMethodsConfiguration.onError).toHaveBeenCalledWith(mockError)
    })

    it('should call card onError if top-level is missing', async () => {
        const cardOnError = jest.fn()
        defaultParams.paymentMethodsConfiguration = {card: {onError: cardOnError}}

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        callArgs.onError({message: 'err'})

        expect(cardOnError).toHaveBeenCalledWith({message: 'err'})
    })

    it('should call onPaymentFailed handler', async () => {
        const onPaymentFailed = jest.fn()
        defaultParams.paymentMethodsConfiguration.onPaymentFailed = onPaymentFailed

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        const mockData = {resultCode: 'Refused'}
        callArgs.onPaymentFailed(mockData, {})

        expect(onPaymentFailed).toHaveBeenCalledWith(mockData, {})
    })

    it('should call card onPaymentFailed if top-level is missing', async () => {
        const cardOnPaymentFailed = jest.fn()
        defaultParams.paymentMethodsConfiguration = {card: {onPaymentFailed: cardOnPaymentFailed}}

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        callArgs.onPaymentFailed({resultCode: 'Refused'}, {})

        expect(cardOnPaymentFailed).toHaveBeenCalledWith({resultCode: 'Refused'}, {})
    })

    it('should call onOrderCancel handler', async () => {
        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        const mockOrder = {orderData: 'data'}
        callArgs.onOrderCancel(mockOrder, 'cancel')

        expect(defaultParams.paymentMethodsConfiguration.onOrderCancel).toHaveBeenCalledWith(
            mockOrder,
            'cancel'
        )
    })

    it('should call giftcard onOrderCancel if top-level is missing', async () => {
        const gcOnOrderCancel = jest.fn()
        defaultParams.paymentMethodsConfiguration = {giftcard: {onOrderCancel: gcOnOrderCancel}}

        await createCheckoutInstance(defaultParams)

        const callArgs = mockAdyenCheckout.mock.calls[0][0]
        callArgs.onOrderCancel({}, 'cancel')

        expect(gcOnOrderCancel).toHaveBeenCalledWith({}, 'cancel')
    })

    it('should include translations when getTranslations returns a value', async () => {
        defaultParams.getTranslations.mockReturnValue({en_US: {pay: 'Pay'}})

        await createCheckoutInstance(defaultParams)

        expect(mockAdyenCheckout).toHaveBeenCalledWith(
            expect.objectContaining({
                locale: 'en_US',
                translations: {en_US: {pay: 'Pay'}}
            })
        )
    })
})
