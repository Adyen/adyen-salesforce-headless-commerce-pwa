import React, {useRef, useEffect} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {useAdyenCheckout} from '../context/adyen-checkout-context'

const AdyenCheckoutComponent = () => {
    const {adyenPaymentMethods, setAdyenStateData, adyenPaymentMethodsConfig} = useAdyenCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const createCheckout = async () => {
            const checkout = await AdyenCheckout({
                environment: adyenPaymentMethods.ADYEN_ENVIRONMENT,
                clientKey: adyenPaymentMethods.ADYEN_CLIENT_KEY,
                paymentMethodsResponse: adyenPaymentMethods,
                paymentMethodsConfiguration: adyenPaymentMethodsConfig,
                onChange: (state) => {
                    if (state.isValid) {
                        setAdyenStateData(state.data)
                    }
                }
            })

            checkout.create('dropin').mount(paymentContainer.current)
        }
        if (adyenPaymentMethods && paymentContainer.current) {
            createCheckout()
        }
    }, [adyenPaymentMethods])

    return <div ref={paymentContainer}></div>
}

export default AdyenCheckoutComponent
