import React, {useEffect, useRef} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {Spinner, Flex} from '@chakra-ui/react'
import PropTypes from 'prop-types'
import {useAdyenExpressCheckout} from '../context/adyen-express-checkout-context'
import {PAYMENT_METHODS} from '../utils/constants.mjs'

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
        (pm) => pm.type === PAYMENT_METHODS.APPLE_PAY
    )
    return applePayPaymentMethod?.configuration || null
}

const getAppleButtonConfig = (checkout, applePayConfig) => {
    return {
        showPayButton: true,
        configuration: applePayConfig,
        amount: 10000,
        requiredShippingContactFields: ['postalAddress', 'email', 'phone'],
        requiredBillingContactFields: ['postalAddress', 'phone'],
        shippingMethods: [
            {
                label: 'test',
                detail: 'test',
                identifier: 1,
                amount: 100
            }
        ],
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
        locale
    } = useAdyenExpressCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const createCheckout = async () => {
            const paymentMethodsConfiguration = await getPaymentMethodsConfiguration(props)
            const checkoutConfig = getCheckoutConfig(
                adyenEnvironment,
                adyenPaymentMethods,
                paymentMethodsConfiguration,
                locale
            )
            const checkout = await AdyenCheckout({
                ...checkoutConfig,
                onChange: (state) => {
                    if (state.isValid) {
                        setAdyenStateData(state.data)
                    }
                }
            })
            const applePaymentMethodConfig = getApplePaymentMethodConfig(checkout)
            console.log(applePaymentMethodConfig)
            const appleButtonConfig = getAppleButtonConfig(checkout, applePaymentMethodConfig)
            console.log(appleButtonConfig)
            const applePayButton = await checkout.create(
                PAYMENT_METHODS.APPLE_PAY,
                appleButtonConfig
            )
            const isApplePayButtonAvailable = await applePayButton.isAvailable()
            console.log(isApplePayButtonAvailable)
        }
        if (adyenEnvironment && paymentContainer.current) {
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
            <div ref={paymentContainer}></div>
        </>
    )
}

ApplePayExpressComponent.propTypes = {
    showLoading: PropTypes.bool
}

export default ApplePayExpressComponent
