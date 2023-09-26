import React, {useRef, useEffect} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {useAdyenCheckout} from '../context/adyen-checkout-context'
import { AdyenPaymentsDetailsService } from "../services/payments-details";
import { AdyenPaymentsService } from "../services/payments";

const AdyenCheckoutComponent = () => {
    const {adyenPaymentMethods, setAdyenStateData, setAdyenCheckoutInstance} = useAdyenCheckout()
    const paymentContainer = useRef(null)
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()

    const sendPaymentsDetails = async (details) => {
        const token = await getTokenWhenReady()
        const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(token)
        const response = await adyenPaymentsDetailsService.submitPaymentsDetails(details, customerId)
        console.log(response);
    }

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
                async onAdditionalDetails(state, element) {
                    console.log('onAdditionalDetails', state);
                    const paymentsDetailsResponse = await sendPaymentsDetails(state.data.details)
                    if (paymentsDetailsResponse?.action) {
                        element.handleAction(paymentsDetailsResponse.action)
                    } else {

                    }
                },
                async onSubmit(state, element) {
                    const token = await getTokenWhenReady()
                    const orderNumber = sessionStorage.getItem('orderNumber')
                    const adyenPaymentService = new AdyenPaymentsService(token)
                    const paymentsResponse = await adyenPaymentService.submitPayment(orderNumber, state.data, customerId)
                    if (paymentsResponse?.action) {
                        element.handleAction(paymentsResponse.action)
                    } else {

                    }
                }
            })

            checkout.create('dropin').mount(paymentContainer.current)
            setAdyenCheckoutInstance(checkout)
        }
        if (adyenPaymentMethods && paymentContainer.current) {
            createCheckout()
        }
    }, [adyenPaymentMethods])

    return <div ref={paymentContainer} className="payment"></div>
}

export default AdyenCheckoutComponent
