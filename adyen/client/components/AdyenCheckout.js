import React, {useEffect, useRef, useState} from 'react'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {useCheckout} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import PropTypes from 'prop-types'
import {ApiClient} from '../services/api'
import API_URLS from '../../utils/apiUrls'

const AdyenCheckoutComponent = ({onChange}) => {
    const {data: basket} = useCurrentBasket()
    const {step, STEPS} = useCheckout()
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const [payment, setPayment] = useState({})
    const paymentContainer = useRef(null)

    useEffect(() => {
        const fetchSession = async () => {
            if (step === STEPS.PAYMENT) {
                const token = await getTokenWhenReady()
                const res = await ApiClient.post(API_URLS.SESSIONS, token, {
                    headers: {
                        customerid: customerId
                    }
                })
                if (res.status >= 300) {
                    setPayment({error: res})
                } else {
                    const data = await res.json()
                    setPayment(data[0])
                    createCheckout(data[0])
                }
            }
        }
        fetchSession()
    }, [step, STEPS, basket])

    useEffect(() => {
        if (payment?.error) {
            // navigate(`/status/error?reason=${error}`, { replace: true });
            console.log(payment?.error)
        }
    }, [payment])

    const createCheckout = async (payment) => {
        const checkout = await AdyenCheckout({
            environment: payment.ADYEN_ENVIRONMENT,
            clientKey: payment.ADYEN_CLIENT_KEY,
            showPayButton: false,
            session: {
                id: payment.id,
                sessionData: payment.sessionData
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
                    onChange(state.data)
                }
            },
            onPaymentCompleted: (response, _component) =>
                // navigate(getRedirectUrl(response.resultCode), { replace: true }),
                console.log(response.resultCode),
            onError: (error, _component) => {
                //navigate(`/status/error?reason=${error.message}`, { replace: true });
                console.log(error)
            }
        })

        if (paymentContainer.current) {
            checkout.create('dropin').mount(paymentContainer.current)
        }
    }

    return <div ref={paymentContainer} className="payment"></div>
}

AdyenCheckoutComponent.propTypes = {onChange: PropTypes.func}

export default AdyenCheckoutComponent
