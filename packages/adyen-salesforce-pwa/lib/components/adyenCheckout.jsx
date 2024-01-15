import React, {useEffect, useRef} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {useAdyenCheckout} from '../context/adyen-checkout-context'

const AdyenCheckoutComponent = (props) => {
    const {
        adyenEnvironment,
        adyenPaymentMethods,
        getPaymentMethodsConfiguration,
        setAdyenStateData,
        setAdyenPaymentInProgress,
        getTranslations,
        locale
    } = useAdyenCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search)
        const redirectResult = urlParams.get('redirectResult')
        const amazonCheckoutSessionId = urlParams.get('amazonCheckoutSessionId')
        const adyenAction = urlParams.get('adyenAction')

        const createCheckout = async () => {
            const paymentMethodsConfiguration = await getPaymentMethodsConfiguration(props)
            const translations = getTranslations()
            const checkoutConfig = {
                environment: adyenEnvironment.ADYEN_ENVIRONMENT,
                clientKey: adyenEnvironment.ADYEN_CLIENT_KEY,
                paymentMethodsResponse: adyenPaymentMethods,
                paymentMethodsConfiguration: paymentMethodsConfiguration
            }
            if (translations) {
                checkoutConfig.locale = locale.id
                checkoutConfig.translations = translations
            }
            const checkout = await AdyenCheckout({
                ...checkoutConfig,
                onSubmit(state, element) {
                    const onSubmit =
                        paymentMethodsConfiguration.onSubmit ||
                        paymentMethodsConfiguration.card.onSubmit
                    onSubmit(state, element)
                },
                onAdditionalDetails(state, element) {
                    const onAdditionalDetails =
                        paymentMethodsConfiguration.onAdditionalDetails ||
                        paymentMethodsConfiguration.card.onAdditionalDetails
                    onAdditionalDetails(state, element)
                },
                onChange: (state) => {
                    if (state.isValid) {
                        setAdyenStateData(state.data)
                    }
                }
            })

            if (redirectResult) {
                checkout.submitDetails({data: {details: {redirectResult}}})
            } else if (amazonCheckoutSessionId) {
                setAdyenPaymentInProgress(true)
                const amazonPayContainer = document.createElement('div')
                const amazonPay = checkout
                    .create('amazonpay', {
                        amazonCheckoutSessionId,
                        showOrderButton: false
                    })
                    .mount(amazonPayContainer)
                amazonPay.submit()
            } else if (adyenAction) {
                const actionString = atob(adyenAction)
                const action = JSON.parse(actionString)
                checkout.createFromAction(action).mount(paymentContainer.current)
            } else {
                checkout.create('dropin').mount(paymentContainer.current)
            }
        }
        if (adyenEnvironment && paymentContainer.current) {
            window.paypal = undefined
            createCheckout()
        }
    }, [adyenEnvironment, adyenPaymentMethods])

    return <div ref={paymentContainer}></div>
}

export default AdyenCheckoutComponent
