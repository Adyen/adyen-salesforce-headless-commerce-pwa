import React, {useEffect, useRef} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import useAdyenCheckout from '../hooks/useAdyenCheckout'
import {Spinner, Flex} from '@chakra-ui/react'
import PropTypes from 'prop-types'

export const getCheckoutConfig = (
    adyenEnvironment,
    adyenPaymentMethods,
    paymentMethodsConfiguration,
    translations,
    locale
) => {
    const checkoutConfig = {
        environment: adyenEnvironment?.ADYEN_ENVIRONMENT,
        clientKey: adyenEnvironment?.ADYEN_CLIENT_KEY,
        paymentMethodsResponse: adyenPaymentMethods,
        paymentMethodsConfiguration: paymentMethodsConfiguration
    }
    if (translations) {
        checkoutConfig.locale = locale.id
        checkoutConfig.translations = translations
    }
    return checkoutConfig
}

export const handleQueryParams = (
    urlParams,
    checkout,
    setAdyenPaymentInProgress,
    paymentContainer
) => {
    const redirectResult = urlParams.get('redirectResult')
    const amazonCheckoutSessionId = urlParams.get('amazonCheckoutSessionId')
    const adyenAction = urlParams.get('adyenAction')

    if (redirectResult) {
        checkout.submitDetails({data: {details: {redirectResult}}})
    } else if (amazonCheckoutSessionId) {
        setAdyenPaymentInProgress(true)
        const amazonPayContainer = document.createElement('div')
        const amazonPay = checkout
            .create('amazonpay', {
                amazonCheckoutSessionId,
                showOrderButton: false
            })
            .mount(amazonPayContainer)
        amazonPay.submit()
    } else if (adyenAction) {
        const actionString = atob(adyenAction)
        const action = JSON.parse(actionString)
        checkout.createFromAction(action).mount(paymentContainer.current)
    } else {
        checkout.create('dropin').mount(paymentContainer.current)
    }
}

const AdyenCheckoutComponent = (props) => {
    const {
        adyenEnvironment,
        adyenPaymentMethods,
        getPaymentMethodsConfiguration,
        setAdyenStateData,
        getTranslations,
        locale,
        adyenPaymentInProgress,
        setAdyenPaymentInProgress
    } = useAdyenCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search)

        const createCheckout = async () => {
            const paymentMethodsConfiguration = await getPaymentMethodsConfiguration(props)
            const translations = getTranslations()
            const checkoutConfig = getCheckoutConfig(
                adyenEnvironment,
                adyenPaymentMethods,
                paymentMethodsConfiguration,
                translations,
                locale
            )
            const checkout = await AdyenCheckout({
                ...checkoutConfig,
                onSubmit(state, element) {
                    const onSubmit =
                        paymentMethodsConfiguration.onSubmit ||
                        paymentMethodsConfiguration.card.onSubmit
                    onSubmit(state, element)
                },
                onAdditionalDetails(state, element) {
                    const onAdditionalDetails =
                        paymentMethodsConfiguration.onAdditionalDetails ||
                        paymentMethodsConfiguration.card.onAdditionalDetails
                    onAdditionalDetails(state, element)
                },
                onChange: (state) => {
                    if (state.isValid) {
                        setAdyenStateData(state.data)
                    }
                }
            })

            handleQueryParams(urlParams, checkout, setAdyenPaymentInProgress, paymentContainer)
        }
        if (adyenEnvironment && paymentContainer.current && !adyenPaymentInProgress) {
            window.paypal = undefined
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

AdyenCheckoutComponent.propTypes = {
    showLoading: PropTypes.bool
}

export default AdyenCheckoutComponent
