import React, {useEffect, useRef} from 'react'
import {useAdyenCheckout} from '../context/adyen-checkout-context'
import '@adyen/adyen-web/dist/adyen.css'
import {AdyenPaymentsService} from '../services/payments'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import AdyenCheckout from '@adyen/adyen-web'
import {AdyenPaymentsDetailsService} from '../services/payments-details'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'

const AdyenPayment = () => {
    const {adyenPaymentMethods, adyenStateData} = useAdyenCheckout()
    const paymentContainer = useRef(null)
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const navigate = useNavigation()

    const handleAction = async (action) => {
        const checkout = await AdyenCheckout({
            environment: adyenPaymentMethods.ADYEN_ENVIRONMENT,
            clientKey: adyenPaymentMethods.ADYEN_CLIENT_KEY,
            onAdditionalDetails(state) {
                console.log('onAdditionalDetails', state)
                sendPaymentsDetails(state.data)
            }
        })
        checkout.createFromAction(action).mount(paymentContainer.current)
    }

    const sendPaymentsDetails = async (data) => {
        const token = await getTokenWhenReady()
        const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(token)
        const paymentsDetailsResponse = await adyenPaymentsDetailsService.submitPaymentsDetails(
            data,
            customerId
        )
        if (paymentsDetailsResponse?.isSuccessful) {
            sessionStorage.removeItem('basketId')
            navigate(`/checkout/confirmation/${paymentsDetailsResponse.merchantReference}`)
        } else if (paymentsDetailsResponse?.action) {
            await handleAction(paymentsDetailsResponse.action)
        } else {
            // error page
        }
    }

    const sendPayment = async () => {
        const token = await getTokenWhenReady()
        const basketId = sessionStorage.getItem('basketId')
        const adyenPaymentService = new AdyenPaymentsService(token)
        const paymentsResponse = await adyenPaymentService.submitPayment(
            adyenStateData,
            basketId,
            customerId
        )
        if (paymentsResponse?.isSuccessful) {
            sessionStorage.removeItem('basketId')
            navigate(`/checkout/confirmation/${paymentsResponse.merchantReference}`)
        } else if (paymentsResponse?.action) {
            await handleAction(paymentsResponse.action)
        } else {
            // error page
        }
    }

    useEffect(() => {
        if (paymentContainer.current) {
            sendPayment()
        }
    }, [])

    return <div ref={paymentContainer} className="payment"></div>
}

export default AdyenPayment
