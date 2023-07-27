import React, {useRef, useEffect} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {useAdyenCheckout} from '../context/adyen-checkout-context'

const AdyenCheckoutComponent = () => {
    const {adyenSession, setAdyenStateData} = useAdyenCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const createCheckout = async () => {
            const checkout = await AdyenCheckout({
                environment: adyenSession.ADYEN_ENVIRONMENT,
                clientKey: adyenSession.ADYEN_CLIENT_KEY,
                showPayButton: false,
                session: {
                    id: adyenSession.id,
                    sessionData: adyenSession.sessionData
                },
                paymentMethodsConfiguration: {
                    card: {
                        hasHolderName: true,
                        holderNameRequired: true,
                        billingAddressRequired: false
                    }
                },
                onChange: (state) => {
                    if (state.isValid) {
                        console.log(state)
                        setAdyenStateData(state.data)
                    }
                },
                onPaymentCompleted: (response, _component) => {
                    // navigate(getRedirectUrl(response.resultCode), { replace: true }),
                    console.log(response)
                },
                onError: (error, _component) => {
                    //navigate(`/status/error?reason=${error.message}`, { replace: true });
                    console.log(error)
                }
            })

            if (paymentContainer.current) {
                checkout.create('dropin').mount(paymentContainer.current)
            }
        }
        createCheckout()
    })

    return <div ref={paymentContainer} className="payment"></div>
}

export default AdyenCheckoutComponent
