import React, {useEffect, useRef, useState} from 'react'
import {useAccessToken} from '@salesforce/commerce-sdk-react'
import {useCurrentCustomer} from '@salesforce/retail-react-app/app/hooks/use-current-customer'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {useCheckout} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
const AdyenCheckoutComponent = () => {
    const {data: customer} = useCurrentCustomer()
    const {data: basket} = useCurrentBasket()
    const {step, STEPS} = useCheckout()
    const {getTokenWhenReady} = useAccessToken()
    const [payment, setPayment] = useState({})
    const [orderRef, setOrderRef] = useState('')
    const paymentContainer = useRef(null)
    useEffect(() => {
        const fetchSession = async () => {
            if (step === STEPS.PAYMENT) {
                const token = await getTokenWhenReady()
                const basketAmount = {value: basket?.orderTotal, currency: basket?.currency}
                fetch(`/sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount: basketAmount
                    })
                }).then((res) => {
                    if (res.status >= 300) {
                        setPayment({error: res})
                    } else {
                        res.json().then((data) => {
                            setPayment(data[0])
                            setOrderRef(data[1])
                            createCheckout(data[0])
                        })
                    }
                })
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
            showPayButton: true,
            session: {
                id: payment.id,
                sessionData: payment.sessionData
            },
            paymentMethodsConfiguration: {
                card: {
                    hasHolderName: true,
                    holderNameRequired: true,
                    billingAddressRequired: true
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

export default AdyenCheckoutComponent
