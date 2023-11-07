import React, {useEffect, useRef} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {useAdyenCheckout} from '../context/adyen-checkout-context'

const AdyenCheckoutComponent = (props) => {
    const {
        adyenPaymentMethods,
        getPaymentMethodsConfiguration,
        setAdyenStateData,
        setAdyenPaymentInProgress
    } = useAdyenCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search)
        const redirectResult = urlParams.get('redirectResult')
        const amazonCheckoutSessionId = urlParams.get('amazonCheckoutSessionId')

        const createCheckout = async () => {
            const paymentMethodsConfiguration = await getPaymentMethodsConfiguration(props)
            const checkout = await AdyenCheckout({
                environment: adyenPaymentMethods.ADYEN_ENVIRONMENT,
                clientKey: adyenPaymentMethods.ADYEN_CLIENT_KEY,
                paymentMethodsResponse: adyenPaymentMethods,
                paymentMethodsConfiguration: paymentMethodsConfiguration,
                onSubmit(state, element) {
                    console.log('onsubmit', state)
                    paymentMethodsConfiguration.card.onSubmit(state, element)
                },
                onAdditionalDetails(state, element) {
                    paymentMethodsConfiguration.card.onAdditionalDetails(state, element)
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
                const amazonPay = checkout
                    .create('amazonpay', {
                        amazonCheckoutSessionId,
                        showOrderButton: false
                    })
                    .mount('body')
                amazonPay.submit()
            } else {
                checkout.create('dropin').mount(paymentContainer.current)
            }
        }
        if (adyenPaymentMethods && paymentContainer.current) {
            window.paypal = undefined
            createCheckout()
        }
    }, [adyenPaymentMethods])

    return <div ref={paymentContainer}></div>
}

export default AdyenCheckoutComponent
