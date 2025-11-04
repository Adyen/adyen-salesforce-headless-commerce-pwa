import {AdyenCheckout, Dropin} from '@adyen/adyen-web/auto'

export const getCheckoutConfig = (adyenEnvironment, adyenPaymentMethods, translations, locale) => {
    const countryCode = locale?.id?.slice(-2)
    return {
        environment: adyenEnvironment?.ADYEN_ENVIRONMENT,
        clientKey: adyenEnvironment?.ADYEN_CLIENT_KEY,
        countryCode,
        paymentMethodsResponse: adyenPaymentMethods,
        ...(translations && {locale: locale.id, translations})
    }
}

export const handleRedirects = (
    redirectResult,
    amazonCheckoutSessionId,
    checkout,
    setIsLoading
) => {
    if (redirectResult) {
        checkout.submitDetails({details: {redirectResult}})
        return true
    }

    if (amazonCheckoutSessionId) {
        setIsLoading(true)
        const amazonPayContainer = document.createElement('div')
        const amazonPay = checkout
            .create('amazonpay', {
                amazonCheckoutSessionId,
                showOrderButton: false
            })
            .mount(amazonPayContainer)
        amazonPay.submit()
        return true
    }

    return false
}

export const mountCheckoutComponent = (
    adyenAction,
    checkout,
    paymentContainer,
    paymentMethodsConfiguration,
    optionalDropinConfiguration
) => {
    if (adyenAction) {
        const action = JSON.parse(atob(adyenAction))
        return checkout.createFromAction(action).mount(paymentContainer.current)
    }

    return new Dropin(checkout, {
        ...optionalDropinConfiguration,
        paymentMethodsConfiguration
    }).mount(paymentContainer.current)
}

export const createCheckoutInstance = async ({
    paymentMethodsConfiguration,
    adyenEnvironment,
    adyenPaymentMethods,
    adyenOrder,
    getTranslations,
    locale,
    setAdyenStateData,
    setIsLoading
}) => {
    const translations = getTranslations()
    const checkoutConfig = getCheckoutConfig(
        adyenEnvironment,
        adyenPaymentMethods,
        translations,
        locale
    )
    const pmc = paymentMethodsConfiguration
    return AdyenCheckout({
        ...checkoutConfig,
        order: adyenOrder,
        async onSubmit(state, element, actions) {
            const handler = pmc.onSubmit || pmc.card?.onSubmit
            if (handler) {
                setIsLoading(true)
                try {
                    await handler(state, element, actions)
                } finally {
                    setIsLoading(false)
                }
            }
        },
        async onAdditionalDetails(state, element, actions) {
            const handler = pmc.onAdditionalDetails || pmc.card?.onAdditionalDetails
            if (handler) {
                setIsLoading(true)
                try {
                    await handler(state, element, actions)
                } finally {
                    setIsLoading(false)
                }
            }
        },
        onChange: (state) => {
            if (state.isValid) {
                setAdyenStateData(state.data)
            }
        },
        onError: (error) => {
            const handler = pmc.onError || pmc.card?.onError
            if (handler) handler(error)
        },
        onOrderCancel(order, action) {
            const handler = pmc.onOrderCancel || pmc.giftcard?.onOrderCancel
            if (handler) handler(order, action)
        }
    })
}
