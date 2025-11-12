import React, {useEffect, useRef, useMemo, useCallback, useState} from 'react'
import PropTypes from 'prop-types'
import '../style/adyenCheckout.css'
import {
    createCheckoutInstance,
    handleRedirects,
    mountCheckoutComponent
} from './helpers/adyenCheckout.utils'
import {paymentMethodsConfiguration as getPaymentMethodsConfig} from './paymentMethodsConfiguration'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import PAGE_TYPES from '../utils/pageTypes.mjs'

const AdyenCheckoutComponent = ({
    // Order and payment data
    basket,
    returnUrl,

    // User data
    authToken,
    customerId,
    isCustomerRegistered = false,
    site,
    locale,
    navigate,

    // Page context
    page = PAGE_TYPES.CHECKOUT,

    // Callbacks
    beforeSubmit = [],
    afterSubmit = [],
    beforeAdditionalDetails = [],
    afterAdditionalDetails = [],
    onError = [],

    // UI
    spinner = null,

    // Optional overrides
    dropinConfiguration = {},
    paymentMethodsConfiguration: additionalPaymentMethodsConfiguration,
    translations,
    onStateChange,

    ...props
}) => {
    const paymentContainer = useRef(null)
    const checkoutRef = useRef(null)
    const dropinRef = useRef(null)
    const [isLoading, setIsLoading] = useState(false)
    const [adyenStateData, setAdyenStateData] = useState(null)
    const [internalOrderNo, setInternalOrderNo] = useState(null)
    const [internalAdyenOrder, setInternalAdyenOrder] = useState(null)
    const [internalAdyenAction, setInternalAdyenAction] = useState(null)
    const [componentKey, setComponentKey] = useState(0)

    // Fetch Adyen environment configuration
    const {
        data: adyenEnvironment,
        error: adyenEnvironmentError,
        isLoading: fetchingEnvironment
    } = useAdyenEnvironment({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site,
        skip: false
    })

    // Fetch Adyen payment methods
    const callPaymentMethodsOnPages = ['checkout']
    const {
        data: adyenPaymentMethods,
        error: adyenPaymentMethodsError,
        isLoading: fetchingPaymentMethods
    } = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site,
        locale,
        skip: !callPaymentMethodsOnPages.includes(page)
    })

    // Update  orderNo when basket changes
    useEffect(() => {
        if (basket?.c_orderNo) {
            if (basket?.c_orderNo && basket?.c_orderNo !== internalOrderNo) {
                setInternalOrderNo(basket?.c_orderNo)
            }
        }
    }, [basket?.c_orderNo])

    // Update internal adyen order when basket changes
    useEffect(() => {
        if (basket?.c_orderData) {
            const c_orderData = JSON.parse(basket.c_orderData)
            if (
                c_orderData?.orderData &&
                c_orderData?.orderData !== internalAdyenOrder?.orderData
            ) {
                setInternalAdyenOrder(c_orderData)
            }
        }
    }, [basket?.c_orderData])

    // Extract redirect params from URL
    const urlParams = useMemo(() => {
        if (typeof window === 'undefined') return {}
        const params = new URLSearchParams(window.location.search)
        return {
            error: params.get('error'),
            redirectResult: params.get('redirectResult'),
            amazonCheckoutSessionId: params.get('amazonCheckoutSessionId')
        }
    }, [])

    // Handle error in URL params - remount component
    useEffect(() => {
        if (urlParams.error) {
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href)
                url.searchParams.delete('error')
                url.searchParams.delete('redirectResult')
                url.searchParams.delete('amazonCheckoutSessionId')
                window.history.replaceState({}, '', url.toString())
            }
            setComponentKey((prev) => prev + 1)
        }
    }, [urlParams.error])

    // Memoize state change handler
    const handleStateChange = useCallback(
        (data) => {
            setAdyenStateData(data)
            if (onStateChange) {
                onStateChange(data)
            }
        },
        [onStateChange]
    )

    // Memoize the payment methods configuration to prevent unnecessary recalculations
    const paymentMethodsConfiguration = useMemo(() => {
        return getPaymentMethodsConfig({
            additionalPaymentMethodsConfiguration,
            paymentMethods: adyenPaymentMethods?.paymentMethods,
            isCustomerRegistered,
            token: authToken,
            site,
            basket,
            adyenOrder: internalAdyenOrder,
            orderNo: internalOrderNo,
            returnUrl,
            customerId,
            setAdyenOrder: setInternalAdyenOrder,
            setAdyenAction: setInternalAdyenAction,
            setOrderNo: setInternalOrderNo,
            navigate,
            onError,
            afterSubmit,
            beforeSubmit,
            afterAdditionalDetails,
            beforeAdditionalDetails
        })
    }, [
        additionalPaymentMethodsConfiguration,
        adyenPaymentMethods?.paymentMethods,
        isCustomerRegistered,
        authToken,
        site?.id,
        basket?.basketId,
        internalAdyenOrder?.orderData,
        internalOrderNo,
        returnUrl,
        customerId,
        navigate
    ])

    // Memoize the translations to prevent unnecessary recalculations
    const getTranslations = useCallback(() => {
        return translations && translations[locale.id] ? translations : null
    }, [translations, locale.id])

    // Initialize Adyen Checkout - only re-run when critical dependencies change
    useEffect(() => {
        if (
            !adyenEnvironment ||
            !paymentContainer.current ||
            fetchingEnvironment ||
            fetchingPaymentMethods
        ) {
            return
        }

        // Handle errors
        if (adyenEnvironmentError) {
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            onError.forEach((cb) => cb(adyenEnvironmentError))
            return
        }

        if (adyenPaymentMethodsError) {
            console.error('Error fetching Adyen payment methods:', adyenPaymentMethodsError)
            onError.forEach((cb) => cb(adyenPaymentMethodsError))
            return
        }

        if (window?.paypal?.firstElementChild) {
            window.paypal = undefined
        }

        let isMounted = true

        const initializeCheckout = async () => {
            try {
                // Prevent re-initialization if dropin already exists
                if (dropinRef.current) {
                    return
                }

                // Create a new Adyen Checkout instance
                checkoutRef.current = await createCheckoutInstance({
                    paymentMethodsConfiguration,
                    adyenEnvironment,
                    adyenPaymentMethods,
                    adyenOrder: internalAdyenOrder,
                    getTranslations: getTranslations,
                    locale,
                    setAdyenStateData: handleStateChange,
                    setIsLoading: setIsLoading
                })

                if (!isMounted) return

                // Handle URL query parameters and mount the checkout component
                const isRedirect = handleRedirects(
                    urlParams.redirectResult,
                    urlParams.amazonCheckoutSessionId,
                    checkoutRef.current,
                    setIsLoading
                )

                if (!isRedirect && !dropinRef.current) {
                    dropinRef.current = mountCheckoutComponent(
                        internalAdyenAction,
                        checkoutRef.current,
                        paymentContainer,
                        paymentMethodsConfiguration,
                        dropinConfiguration
                    )
                }
            } catch (error) {
                console.error('Error initializing Adyen Checkout:', error)
                onError.forEach((cb) => cb(error))
            }
        }

        initializeCheckout()

        // Cleanup function to unmount the dropin when the component unmounts
        return () => {
            isMounted = false
            if (dropinRef.current) {
                try {
                    dropinRef.current.unmount()
                    // PayPal specific cleanup: destroy the PayPal instance
                    if (window.paypal && typeof window.paypal.__internal_destroy__ === 'function') {
                        window.paypal.__internal_destroy__()
                    }
                } catch (e) {
                    console.error('Error unmounting dropin:', e)
                }
                dropinRef.current = null
            }
        }
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        adyenPaymentMethods?.paymentMethods,
        internalAdyenAction,
        internalAdyenOrder?.orderData,
        componentKey
    ])

    return (
        <>
            {(isLoading || fetchingEnvironment || fetchingPaymentMethods) && spinner && (
                <div className="adyen-checkout-spinner-container">{spinner}</div>
            )}
            <div ref={paymentContainer}></div>
        </>
    )
}

AdyenCheckoutComponent.propTypes = {
    // Required props
    authToken: PropTypes.string.isRequired,
    site: PropTypes.object.isRequired,
    locale: PropTypes.object.isRequired,
    navigate: PropTypes.func.isRequired,
    basket: PropTypes.object.isRequired,

    // Order and payment data
    returnUrl: PropTypes.string,

    // User data
    customerId: PropTypes.string,
    isCustomerRegistered: PropTypes.bool,

    // Page context
    page: PropTypes.oneOf(['checkout', 'confirmation', 'redirect']),

    // Optional callbacks
    beforeSubmit: PropTypes.arrayOf(PropTypes.func),
    afterSubmit: PropTypes.arrayOf(PropTypes.func),
    beforeAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    afterAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    onError: PropTypes.arrayOf(PropTypes.func),
    onStateChange: PropTypes.func,

    // UI
    spinner: PropTypes.node,

    // Optional overrides
    dropinConfiguration: PropTypes.object,
    paymentMethodsConfiguration: PropTypes.object
}

export default React.memo(AdyenCheckoutComponent, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.basket?.c_orderData === nextProps.basket?.c_orderData &&
        prevProps.authToken === nextProps.authToken &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.locale?.id === nextProps.locale?.id
    )
})
