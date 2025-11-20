import React, {useEffect, useRef, useMemo} from 'react'
import PropTypes from 'prop-types'
import {AdyenCheckout, PayPal} from '@adyen/adyen-web'
import '../style/adyenCheckout.css'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import {paypalExpressConfig} from './paypal/expressConfig'

const PayPalExpressComponent = (props) => {
    const {
        authToken,
        customerId,
        locale,
        site,
        basket,
        navigate,
        beforeSubmit = [],
        afterSubmit = [],
        beforeAdditionalDetails = [],
        afterAdditionalDetails = [],
        onError = [],
        spinner
    } = props

    const basketId = basket?.basketId
    const paymentContainer = useRef(null)
    const paypalButtonRef = useRef(null)

    const {
        data: adyenEnvironment,
        error: adyenEnvironmentError,
        isLoading: isLoadingEnvironment
    } = useAdyenEnvironment({
        authToken,
        customerId,
        basketId,
        site
    })

    const {
        data: adyenPaymentMethods,
        error: adyenPaymentMethodsError,
        isLoading: isLoadingPaymentMethods
    } = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId,
        site,
        locale
    })

    const isLoading = useMemo(
        () => isLoadingEnvironment || isLoadingPaymentMethods,
        [isLoadingEnvironment, isLoadingPaymentMethods]
    )

    const hasPayPalMethod = useMemo(() => {
        return adyenPaymentMethods?.paymentMethods?.some((method) => method.type === 'paypal')
    }, [adyenPaymentMethods?.paymentMethods])

    useEffect(() => {
        if (adyenEnvironmentError) {
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            onError.forEach((cb) => cb(adyenEnvironmentError))
        }
    }, [adyenEnvironmentError, onError])

    useEffect(() => {
        if (adyenPaymentMethodsError) {
            console.error('Error fetching Adyen payment methods:', adyenPaymentMethodsError)
            onError.forEach((cb) => cb(adyenPaymentMethodsError))
        }
    }, [adyenPaymentMethodsError, onError])

    useEffect(() => {
        if (window?.paypal?.firstElementChild) {
            window.paypal = undefined
        }
        const initializeCheckout = async () => {
            const shouldInitialize = !!(
                adyenEnvironment &&
                adyenPaymentMethods &&
                basket &&
                hasPayPalMethod &&
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
                    paymentMethodsResponse: adyenPaymentMethods,
                    analytics: {
                        analyticsData: {
                            applicationInfo: adyenPaymentMethods?.applicationInfo
                        }
                    }
                })

                const expressConfig = paypalExpressConfig({
                    token: authToken,
                    customerId,
                    basket,
                    site,
                    locale,
                    navigate,
                    beforeSubmit,
                    afterSubmit,
                    beforeAdditionalDetails,
                    afterAdditionalDetails,
                    onError
                })

                const paypalButton = new PayPal(checkout, expressConfig)

                const mountPayPalButton = () => {
                    if (paypalButtonRef.current) {
                        paypalButtonRef.current.unmount()
                    }
                    paypalButton.mount(paymentContainer.current)
                    paypalButtonRef.current = paypalButton
                }

                if (typeof paypalButton.isAvailable === 'function') {
                    paypalButton
                        .isAvailable()
                        .then(mountPayPalButton)
                        .catch((err) => {
                            console.warn('PayPal Express is not available:', err)
                        })
                } else {
                    mountPayPalButton()
                }
            } catch (err) {
                console.error('Error initializing PayPal Express:', err)
                onError.forEach((cb) => cb(err))
            }
        }

        initializeCheckout()

        return () => {
            if (paypalButtonRef.current) {
                try {
                    paypalButtonRef.current.unmount()
                    // PayPal specific cleanup: destroy the PayPal instance
                    if (window.paypal && typeof window.paypal.__internal_destroy__ === 'function') {
                        window.paypal.__internal_destroy__()
                    }
                } catch (e) {
                    console.error('Error unmounting paypalButton:', e)
                }
                paypalButtonRef.current = null
            }
        }
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        adyenPaymentMethods?.paymentMethods,
        adyenPaymentMethods?.applicationInfo,
        basket?.basketId,
        locale?.id,
        authToken,
        site?.id,
        hasPayPalMethod,
        beforeSubmit,
        afterSubmit,
        beforeAdditionalDetails,
        afterAdditionalDetails,
        onError,
        navigate
    ])

    return (
        <>
            {isLoading && spinner && <>{spinner}</>}
            <div className="adyen-paypal-express-button-container" ref={paymentContainer}></div>
        </>
    )
}

PayPalExpressComponent.propTypes = {
    authToken: PropTypes.string.isRequired,
    customerId: PropTypes.string,
    locale: PropTypes.object.isRequired,
    site: PropTypes.object.isRequired,
    basket: PropTypes.object.isRequired,
    navigate: PropTypes.func.isRequired,
    beforeSubmit: PropTypes.arrayOf(PropTypes.func),
    afterSubmit: PropTypes.arrayOf(PropTypes.func),
    beforeAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    afterAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    onError: PropTypes.arrayOf(PropTypes.func),
    spinner: PropTypes.node
}

export default React.memo(PayPalExpressComponent, (prevProps, nextProps) => {
    return (
        prevProps.authToken === nextProps.authToken &&
        prevProps.customerId === nextProps.customerId &&
        prevProps.locale?.id === nextProps.locale?.id &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.navigate === nextProps.navigate
    )
})
