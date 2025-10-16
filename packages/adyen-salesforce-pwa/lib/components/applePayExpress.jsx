import React, {useEffect, useRef} from 'react'
import PropTypes from 'prop-types'
import {AdyenCheckout, ApplePay} from '@adyen/adyen-web'
import '@adyen/adyen-web/styles/adyen.css'
import useAdyenExpressCheckout from '../hooks/useAdyenExpressCheckout'
import {getAppleButtonConfig, getApplePaymentMethodConfig} from './helpers/applePayExpress.utils'

const ApplePayExpressComponent = (props) => {
    const {
        adyenEnvironment,
        adyenPaymentMethods,
        basket,
        locale,
        site,
        authToken,
        navigate,
        shippingMethods,
        fetchShippingMethods
    } = useAdyenExpressCheckout()
    const paymentContainer = useRef(null)
    const applePayButtonRef = useRef(null)

    useEffect(() => {
        const initializeCheckout = async () => {
            const shouldInitialize = !!(
                adyenEnvironment &&
                adyenPaymentMethods &&
                basket &&
                shippingMethods &&
                paymentContainer.current
            )

            if (!shouldInitialize) {
                return
            }

            try {
                const countryCode = locale?.id?.slice(-2)
                const checkout = await AdyenCheckout({
                    environment: adyenEnvironment?.ADYEN_ENVIRONMENT,
                    clientKey: adyenEnvironment?.ADYEN_CLIENT_KEY,
                    countryCode,
                    locale: locale.id,
                    analytics: {
                        analyticsData: {
                            applicationInfo: adyenPaymentMethods?.applicationInfo
                        }
                    }
                })
                const applePaymentMethodConfig = getApplePaymentMethodConfig(adyenPaymentMethods)
                if (!applePaymentMethodConfig) {
                    return
                }

                const appleButtonConfig = getAppleButtonConfig(
                    authToken,
                    site,
                    basket,
                    shippingMethods?.applicableShippingMethods,
                    applePaymentMethodConfig,
                    navigate,
                    fetchShippingMethods
                )
                const applePayButton = new ApplePay(checkout, appleButtonConfig)
                const isApplePayButtonAvailable = await applePayButton.isAvailable()
                if (isApplePayButtonAvailable) {
                    if (applePayButtonRef.current) {
                        applePayButtonRef.current.unmount()
                    }
                    applePayButton.mount(paymentContainer.current)
                    applePayButtonRef.current = applePayButton
                }
            } catch (err) {
                console.error(err)
            }
        }

        initializeCheckout()

        return () => {
            if (applePayButtonRef.current) {
                applePayButtonRef.current.unmount()
                applePayButtonRef.current = null
            }
        }
    }, [
        adyenEnvironment,
        adyenPaymentMethods,
        basket,
        shippingMethods,
        locale,
        authToken,
        site,
        navigate,
        fetchShippingMethods
    ])

    const {showLoading, spinner} = props
    return (
        <>
            {showLoading && spinner && (
                <div className="adyen-checkout-spinner-container">{spinner}</div>
            )}
            <div ref={paymentContainer}></div>
        </>
    )
}

ApplePayExpressComponent.propTypes = {
    showLoading: PropTypes.bool,
    spinner: PropTypes.node
}

export default ApplePayExpressComponent
