import React, {useEffect, useRef} from 'react'
import PropTypes from 'prop-types'
import useAdyenCheckout from '../hooks/useAdyenCheckout'
import '../style/adyenCheckout.css'
import {createCheckoutInstance, handleQueryParams} from './helpers/adyenCheckout.utils'

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
        checkoutDropin,
        setCheckoutDropin,
        getPaymentMethodsConfiguration,
        adyenPaymentInProgress,
        setAdyenPaymentInProgress,
        getTranslations,
        locale,
        setAdyenStateData,
        orderNo,
        navigate
    } = useAdyenCheckout()

    const paymentContainer = useRef(null)
    const dropinRef = useRef(checkoutDropin)
    dropinRef.current = checkoutDropin

    useEffect(() => {
        const initializeCheckout = async () => {
            // Guard against running initialization when not ready
            if (!adyenEnvironment || !paymentContainer.current || adyenPaymentInProgress) {
                return
            }

            // Unmount any existing checkout instance
            if (dropinRef.current) {
                dropinRef.current.unmount()
            }
            window.paypal = undefined

            // 1. Fetch the payment methods configuration
            const paymentMethodsConfiguration = await getPaymentMethodsConfiguration({
                beforeSubmit,
                afterSubmit,
                beforeAdditionalDetails,
                afterAdditionalDetails,
                onError
            })

            // 2. Create a new Adyen Checkout instance
            const checkout = await createCheckoutInstance({
                paymentMethodsConfiguration,
                optionalDropinConfiguration,
                adyenEnvironment,
                adyenPaymentMethods,
                adyenOrder,
                getTranslations,
                locale,
                setAdyenStateData,
                orderNo,
                navigate
            })

            // 3. Handle URL query parameters and mount the checkout component
            const urlParams = new URLSearchParams(window.location.search)
            const dropin = handleQueryParams(
                urlParams,
                checkout,
                setAdyenPaymentInProgress,
                paymentContainer,
                paymentMethodsConfiguration,
                optionalDropinConfiguration
            )
            setCheckoutDropin(dropin)
        }

        initializeCheckout()

        // Cleanup function to unmount the dropin when the component unmounts or dependencies change
        return () => {
            if (dropinRef.current) {
                dropinRef.current.unmount()
            }
        }
    }, [adyenEnvironment, adyenPaymentMethods, adyenOrder])

    return (
        <>
            {showLoading && spinner && (
                <div className='adyen-checkout-spinner-container'>{spinner}</div>
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
