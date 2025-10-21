import React, {useEffect, useRef} from 'react'
import PropTypes from 'prop-types'
import useAdyenCheckout from '../hooks/useAdyenCheckout'
import '../style/adyenCheckout.css'
import {
    createCheckoutInstance,
    handleRedirects,
    mountCheckoutComponent
} from './helpers/adyenCheckout.utils'

const AdyenCheckoutComponent = (props) => {
    const {
        showLoading,
        spinner,
        beforeSubmit,
        afterSubmit,
        beforeAdditionalDetails,
        afterAdditionalDetails,
        onError
    } = props

    const {
        adyenEnvironment,
        adyenPaymentMethods,
        adyenOrder,
        optionalDropinConfiguration,
        getPaymentMethodsConfiguration,
        getTranslations,
        locale,
        setAdyenStateData,
        orderNo,
        navigate,
        adyenAction,
        redirectResult,
        amazonCheckoutSessionId,
        isLoading,
        setIsLoading
    } = useAdyenCheckout()

    const paymentContainer = useRef(null)
    const checkoutRef = useRef(null) // To hold the checkout instance
    const dropinRef = useRef(null) // To hold the dropin instance

    useEffect(() => {
        const initializeCheckout = async () => {
            // Guard against running initialization when not ready
            if (!adyenEnvironment || !paymentContainer.current) {
                return
            }
            // The PayPal namespace needs to be cleared before checkout is initialized.
            // This is because there is a namespace clash between PayPal sdk from Adyen checkout and retail react app.
            if (window?.paypal?.firstElementChild) {
                window.paypal = undefined
            }
            // Unmount any existing checkout instance
            if (dropinRef.current) {
                dropinRef.current.unmount()
                dropinRef.current = null
            }
            if (checkoutRef.current && adyenOrder?.orderData) {
                checkoutRef.current.update({order: adyenOrder})
            }

            // checkoutRef.current = null

            // 1. Fetch the payment methods configuration
            const paymentMethodsConfiguration = await getPaymentMethodsConfiguration({
                beforeSubmit,
                afterSubmit,
                beforeAdditionalDetails,
                afterAdditionalDetails,
                onError
            })

            // 2. Create a new Adyen Checkout instance
            checkoutRef.current = await createCheckoutInstance({
                paymentMethodsConfiguration,
                optionalDropinConfiguration,
                adyenEnvironment,
                adyenPaymentMethods,
                adyenOrder,
                getTranslations,
                locale,
                setAdyenStateData,
                orderNo,
                navigate,
                setIsLoading
            })

            // 3. Handle URL query parameters and mount the checkout component
            const isRedirect = handleRedirects(
                redirectResult,
                amazonCheckoutSessionId,
                checkoutRef.current
            )

            if (!isRedirect) {
                dropinRef.current = mountCheckoutComponent(
                    adyenAction,
                    checkoutRef.current,
                    paymentContainer,
                    paymentMethodsConfiguration,
                    optionalDropinConfiguration
                )
            }
        }

        initializeCheckout()
        // Cleanup function to unmount the dropin when the component unmounts or dependencies change
        return () => {
            if (dropinRef.current) {
                dropinRef.current.unmount()
                dropinRef.current = null
            }
        }
    }, [adyenEnvironment, adyenAction, adyenOrder?.orderData])

    return (
        <>
            {(isLoading || showLoading) && spinner && (
                <div className="adyen-checkout-spinner-container">{spinner}</div>
            )}
            <div ref={paymentContainer}></div>
        </>
    )
}

AdyenCheckoutComponent.propTypes = {
    showLoading: PropTypes.bool,
    spinner: PropTypes.node,
    beforeSubmit: PropTypes.arrayOf(PropTypes.func),
    afterSubmit: PropTypes.arrayOf(PropTypes.func),
    beforeAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    afterAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    onError: PropTypes.arrayOf(PropTypes.func)
}

export default AdyenCheckoutComponent
