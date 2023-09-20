import React, {useRef, useEffect} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {useAdyenCheckout} from '../context/adyen-checkout-context'

const AdyenCheckoutComponent = () => {
    const {adyenPaymentMethods, setAdyenStateData} = useAdyenCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const createCheckout = async () => {
            const checkout = await AdyenCheckout({
                environment: adyenPaymentMethods.ADYEN_ENVIRONMENT,
                clientKey: adyenPaymentMethods.ADYEN_CLIENT_KEY,
                showPayButton: false,
                paymentMethodsResponse: adyenPaymentMethods,
                paymentMethodsConfiguration: {
                    card: {
                        hasHolderName: true,
                        holderNameRequired: true,
                        billingAddressRequired: false
                    }
                },
                onChange: (state) => {
                    if (state.isValid) {
                        setAdyenStateData(state.data)
                    }
                },
                onPaymentCompleted: (response, _component) => {
                    // navigate(getRedirectUrl(response.resultCode), { replace: true }),
                    console.log('onPaymentCompleted', response)
                },
                onError: (error, _component) => {
                    //navigate(`/status/error?reason=${error.message}`, { replace: true });
                    console.log('onError', error)
                },
                onAdditionalDetails(state, element) {
                    console.log('onAdditionalDetails', state);
                }
            })

            checkout.create('dropin').mount(paymentContainer.current)
        }
        if (adyenPaymentMethods && paymentContainer.current) {
            createCheckout()
        }
    }, [adyenPaymentMethods])

    return <div ref={paymentContainer} className="payment"></div>
}

export default AdyenCheckoutComponent
