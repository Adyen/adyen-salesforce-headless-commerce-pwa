import React, {useEffect, useRef} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {Spinner, Flex} from '@chakra-ui/react'
import PropTypes from 'prop-types'
import {useAdyenExpressCheckout} from '../context/adyen-express-checkout-context'
import {getCurrencyValueForApi} from '../utils/parsers.mjs'

const getCheckoutConfig = (
    adyenEnvironment,
    adyenPaymentMethods,
    paymentMethodsConfiguration,
    locale
) => {
    return {
        environment: adyenEnvironment?.ADYEN_ENVIRONMENT,
        clientKey: adyenEnvironment?.ADYEN_CLIENT_KEY,
        paymentMethodsResponse: adyenPaymentMethods,
        paymentMethodsConfiguration: paymentMethodsConfiguration,
        locale: locale.id
    }
}

const getApplePaymentMethodConfig = (checkout) => {
    const applePayPaymentMethod = checkout?.paymentMethodsResponse?.paymentMethods?.find(
        (pm) => pm.type === 'applepay'
    )
    return applePayPaymentMethod?.configuration || null
}

const getAppleButtonConfig = (checkout, shippingMethods, applePayConfig) => {
    return {
        showPayButton: true,
        configuration: applePayConfig,
        amount: checkout.options.amount,
        requiredShippingContactFields: ['postalAddress', 'email', 'phone'],
        requiredBillingContactFields: ['postalAddress', 'phone'],
        shippingMethods: shippingMethods?.map((sm) => ({
            label: sm.name,
            detail: sm.description,
            identifier: sm.id,
            amount: `${sm.price}`
        })),
        onAuthorized: async (resolve, reject, event) => {},
        onSubmit: () => {
            // This handler is empty to prevent sending a second payment request
            // We already do the payment in paymentFromComponent
        },
        onShippingMethodSelected: async (resolve, reject, event) => {},
        onShippingContactSelected: async (resolve, reject, event) => {}
    }
}

const ApplePayExpressComponent = (props) => {
    const {
        adyenEnvironment,
        adyenPaymentMethods,
        getPaymentMethodsConfiguration,
        setAdyenStateData,
        basket,
        locale
    } = useAdyenExpressCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const createCheckout = async () => {
            try {
                const paymentMethodsConfiguration = await getPaymentMethodsConfiguration(props)
                const checkoutConfig = getCheckoutConfig(
                    adyenEnvironment,
                    adyenPaymentMethods,
                    paymentMethodsConfiguration,
                    locale
                )
                const checkout = await AdyenCheckout({
                    ...checkoutConfig,
                    amount: {
                        value: getCurrencyValueForApi(basket.orderTotal, basket.currency),
                        currency: basket.currency
                    },
                    onChange: (state) => {
                        if (state.isValid) {
                            setAdyenStateData(state.data)
                        }
                    }
                })
                const applePaymentMethodConfig = getApplePaymentMethodConfig(checkout)
                const appleButtonConfig = getAppleButtonConfig(
                    checkout,
                    props.shippingMethods,
                    applePaymentMethodConfig
                )
                const applePayButton = await checkout.create('applepay', appleButtonConfig)
                const isApplePayButtonAvailable = await applePayButton.isAvailable()
                if (isApplePayButtonAvailable) {
                    applePayButton.mount(paymentContainer.current)
                }
            } catch (err) {
                console.log(err)
            }
        }
        if (adyenEnvironment && adyenPaymentMethods && basket && paymentContainer.current) {
            createCheckout()
        }
    }, [adyenEnvironment, adyenPaymentMethods])

    return (
        <>
            {props.showLoading && (
                <Flex align={'center'} justify={'center'}>
                    <Spinner size={'lg'} mt={4} />
                </Flex>
            )}
            <div style={{width: '100%'}} ref={paymentContainer}></div>
        </>
    )
}

ApplePayExpressComponent.propTypes = {
    showLoading: PropTypes.bool,
    shippingMethods: PropTypes.array
}

export default ApplePayExpressComponent
