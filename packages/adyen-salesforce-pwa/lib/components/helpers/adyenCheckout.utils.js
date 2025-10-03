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

export const handleQueryParams = (
    urlParams,
    checkout,
    setAdyenPaymentInProgress,
    paymentContainer,
    paymentMethodsConfiguration,
    optionalDropinConfiguration,
) => {
    const redirectResult = urlParams.get('redirectResult')
    const amazonCheckoutSessionId = urlParams.get('amazonCheckoutSessionId')
    const adyenAction = urlParams.get('adyenAction')

    if (redirectResult) {
        checkout.submitDetails({data: {details: {redirectResult}}})
        return null // No component to mount
    }
    if (amazonCheckoutSessionId) {
        setAdyenPaymentInProgress(true)
        const amazonPayContainer = document.createElement('div')
        const amazonPay = checkout
            .create('amazonpay', {
                amazonCheckoutSessionId,
                showOrderButton: false
            })
            .mount(amazonPayContainer)
        amazonPay.submit()
        return null // No component to mount
    }
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
                                                 orderNo,
                                                 navigate
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
        onSubmit(state, element, actions) {
            const handler = pmc.onSubmit || pmc.card?.onSubmit
            if (handler) handler(state, element, actions)
        },
        onAdditionalDetails(state, element, actions) {
            const handler = pmc.onAdditionalDetails || pmc.card?.onAdditionalDetails
            if (handler) handler(state, element, actions)
        },
        onChange: (state) => {
            if (state.isValid) {
                setAdyenStateData(state.data)
            }
        },
        onError() {
            const handler = pmc.onError || pmc.card?.onError
            if (handler) handler(orderNo, navigate)
        },
        onOrderCancel(order, action) {
            const handler = pmc.onOrderCancel || pmc.giftcard?.onOrderCancel
            if (handler) handler(order, action)
        }
    })
}
