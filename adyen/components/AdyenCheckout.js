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
                paymentMethodsResponse: adyenPaymentMethods,
                paymentMethodsConfiguration: {
                    card: {
                        showPayButton: false,
                        hasHolderName: true,
                        holderNameRequired: true,
                        billingAddressRequired: false,
                        onBinValue: (event) => {
                            console.log(event)
                        },
                        onBinLookup: (event) => {
                            console.log(event)
                        }
                    },
                    paypal: {
                        showPayButton: true,
                        onSubmit: (state, component) => {
                            console.log(state)
                            if (state.isValid) {
                                setAdyenStateData(state.data)
                            }
                        }
                    },
                    klarna: {
                        showPayButton: true,
                        useKlarnaWidget: true,
                        onSubmit: (state, component) => {
                            console.log(state)
                            if (state.isValid) {
                                setAdyenStateData(state.data)
                            }
                        }
                    },
                    klarna_account: {
                        showPayButton: true,
                        useKlarnaWidget: true,
                        onSubmit: (state, component) => {
                            console.log(state)
                            if (state.isValid) {
                                setAdyenStateData(state.data)
                            }
                        }
                    },
                    klarna_paynow: {
                        showPayButton: true,
                        useKlarnaWidget: true,
                        onSubmit: (state, component) => {
                            console.log(state)
                            if (state.isValid) {
                                setAdyenStateData(state.data)
                            }
                        }
                    }
                },
                onChange: (state) => {
                    if (state.isValid) {
                        setAdyenStateData(state.data)
                    }
                },
                onSubmit: (state, component) => {
                    console.log(state)
                    if (state.isValid) {
                        setAdyenStateData(state.data)
                    }
                }
            })

            console.log('mount')
            checkout.create('dropin').mount(paymentContainer.current)
        }
        if (adyenPaymentMethods && paymentContainer.current) {
            createCheckout()
        }
    }, [adyenPaymentMethods])

    return <div ref={paymentContainer}></div>
}

export default AdyenCheckoutComponent
