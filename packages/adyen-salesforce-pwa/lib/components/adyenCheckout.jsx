import React, {useEffect, useRef, useMemo, useCallback, useState} from 'react'
import {useAccessToken, useCustomerId, useCustomerType} from '@salesforce/commerce-sdk-react'
import PropTypes from 'prop-types'
import '../style/adyenCheckout.css'
import {
    createCheckoutInstance,
    handleRedirects,
    mountCheckoutComponent
} from './helpers/adyenCheckout.utils'
import {getAmount} from './helpers/baseConfig'
import {paymentMethodsConfiguration as getPaymentMethodsConfig} from './paymentMethodsConfiguration'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import useAdyenOrderNumber from '../hooks/useAdyenOrderNumber'
import PAGE_TYPES from '../utils/pageTypes.mjs'

const AdyenCheckoutComponent = ({
    // Order and payment data
    basket,
    returnUrl,

    // User data
    merchantDisplayName = '',
    locale,
    site,
    navigate,
    authToken: authTokenProp,
    customerId: customerIdProp,

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
    const adyenOrderRef = useRef(null)
    const errorShownRef = useRef(false)
    const [isLoading, setIsLoading] = useState(false)
    const [adyenStateData, setAdyenStateData] = useState(null)
    const [internalOrderNo, setInternalOrderNo] = useState(null)
    const [internalAdyenOrder, setInternalAdyenOrder] = useState(null)
    const [internalAdyenAction, setInternalAdyenAction] = useState(null)
    const [componentKey, setComponentKey] = useState(0)

    const hookCustomerId = useCustomerId()
    const customerId = customerIdProp || hookCustomerId
    const customerTypeData = useCustomerType()
    const isCustomerRegistered = customerTypeData.isRegistered
    const {getTokenWhenReady} = useAccessToken()
    const [authToken, setAuthToken] = useState(authTokenProp)

    useEffect(() => {
        if (authTokenProp) return
        const getToken = async () => {
            const token = await getTokenWhenReady()
            setAuthToken(token)
        }

        getToken()
    }, [authTokenProp])

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

    // Fetch a fresh order number if the basket does not already have one.
    const {
        orderNo: fetchedOrderNo,
        error: orderNumberError,
        isLoading: fetchingOrderNumber
    } = useAdyenOrderNumber({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site,
        existingOrderNo: basket?.c_orderNo,
        skip: page !== PAGE_TYPES.CHECKOUT
    })

    // Sync order number into internal state from either the basket or the fetch result
    useEffect(() => {
        const resolvedOrderNo = basket?.c_orderNo || fetchedOrderNo
        if (resolvedOrderNo && resolvedOrderNo !== internalOrderNo) {
            setInternalOrderNo(resolvedOrderNo)
        }
    }, [basket?.c_orderNo, fetchedOrderNo])

    const setAdyenOrder = useCallback((order) => {
        adyenOrderRef.current = order
        setInternalAdyenOrder(order)
    }, [])

    const resetDropin = useCallback(() => {
        setComponentKey((prev) => prev + 1)
    }, [])

    const resetDropinTimerRef = useRef(null)

    // Remount the dropin when the adyen order changes (e.g. after giftcard applied).
    // Debounced to avoid racing remounts when orderData and remainingAmount change in sequence
    // (create-order fires first with full amount, then payments fires with the deducted amount).
    useEffect(() => {
        if (!dropinRef.current) return
        if (resetDropinTimerRef.current) clearTimeout(resetDropinTimerRef.current)
        resetDropinTimerRef.current = setTimeout(() => {
            resetDropinTimerRef.current = null
            resetDropin()
        }, 50)
        return () => {
            if (resetDropinTimerRef.current) clearTimeout(resetDropinTimerRef.current)
        }
    }, [internalAdyenOrder?.orderData, internalAdyenOrder?.remainingAmount?.value])

    // Update internal adyen order when basket changes
    useEffect(() => {
        if (basket?.c_orderData) {
            const c_orderData = JSON.parse(basket.c_orderData)
            if (
                c_orderData?.orderData &&
                c_orderData?.orderData !== internalAdyenOrder?.orderData
            ) {
                setAdyenOrder(c_orderData)
            }
        }
    }, [basket?.c_orderData])

    // Extract redirect params from URL
    const urlParams = useMemo(() => {
        if (typeof window === 'undefined') return {}
        const params = new URLSearchParams(window.location.search)
        return {
            redirectResult: params.get('redirectResult'),
            amazonCheckoutSessionId: params.get('amazonCheckoutSessionId')
        }
    }, [])

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
        if (!authToken) return null
        return getPaymentMethodsConfig({
            additionalPaymentMethodsConfiguration,
            paymentMethods: adyenPaymentMethods?.paymentMethods,
            isCustomerRegistered,
            merchantDisplayName,
            token: authToken,
            site,
            basket,
            adyenOrder: internalAdyenOrder,
            orderNo: internalOrderNo,
            returnUrl,
            customerId,
            setAdyenOrder: setAdyenOrder,
            setAdyenAction: setInternalAdyenAction,
            setOrderNo: setInternalOrderNo,
            resetDropin: resetDropin,
            navigate,
            onError,
            afterSubmit,
            beforeSubmit,
            afterAdditionalDetails,
            beforeAdditionalDetails,
            locale
        })
    }, [
        additionalPaymentMethodsConfiguration,
        adyenPaymentMethods?.paymentMethods,
        isCustomerRegistered,
        merchantDisplayName,
        authToken,
        site?.id,
        basket?.basketId,
        internalAdyenOrder?.orderData,
        internalAdyenOrder?.remainingAmount?.value,
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
            !paymentMethodsConfiguration ||
            fetchingEnvironment ||
            fetchingPaymentMethods ||
            fetchingOrderNumber
        ) {
            return
        }

        // Handle errors
        if (adyenEnvironmentError && !errorShownRef.current) {
            errorShownRef.current = true
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            onError.forEach((cb) => cb(adyenEnvironmentError))
            return
        }

        if (adyenPaymentMethodsError && !errorShownRef.current) {
            errorShownRef.current = true
            console.error('Error fetching Adyen payment methods:', adyenPaymentMethodsError)
            onError.forEach((cb) => cb(adyenPaymentMethodsError))
            return
        }

        if (orderNumberError && !errorShownRef.current) {
            errorShownRef.current = true
            console.error('Error fetching order number:', orderNumberError)
            onError.forEach((cb) => cb(orderNumberError))
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
                    adyenOrder: adyenOrderRef.current,
                    basket,
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
                    const mountAmount = getAmount({basket, adyenOrder: adyenOrderRef.current})
                    dropinRef.current = mountCheckoutComponent(
                        internalAdyenAction,
                        checkoutRef.current,
                        paymentContainer,
                        paymentMethodsConfiguration,
                        dropinConfiguration,
                        mountAmount,
                        adyenOrderRef.current
                    )
                }
            } catch (error) {
                console.error('Error initializing Adyen Checkout:', error)
                if (!errorShownRef.current) {
                    errorShownRef.current = true
                    onError.forEach((cb) => cb(error))
                }
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
        fetchingOrderNumber,
        internalAdyenAction,
        componentKey
    ])

    return (
        <>
            {(isLoading || fetchingEnvironment || fetchingPaymentMethods || fetchingOrderNumber) &&
                spinner && <>{spinner}</>}
            <div ref={paymentContainer}></div>
        </>
    )
}

AdyenCheckoutComponent.propTypes = {
    // Required props
    site: PropTypes.object.isRequired,
    locale: PropTypes.object.isRequired,
    navigate: PropTypes.func.isRequired,
    basket: PropTypes.object.isRequired,

    // Order and payment data
    returnUrl: PropTypes.string,

    // User data
    merchantDisplayName: PropTypes.string,

    // Page context
    page: PropTypes.oneOf(['checkout', 'confirmation', 'redirect']),

    // Optional callbacks
    beforeSubmit: PropTypes.arrayOf(PropTypes.func),
    afterSubmit: PropTypes.arrayOf(PropTypes.func),
    beforeAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    afterAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    onError: PropTypes.arrayOf(PropTypes.func),
    onStateChange: PropTypes.func,
    authToken: PropTypes.string,
    customerId: PropTypes.string,

    // UI
    spinner: PropTypes.node,

    // Optional overrides
    dropinConfiguration: PropTypes.object,
    paymentMethodsConfiguration: PropTypes.object,
    translations: PropTypes.object
}

export default React.memo(AdyenCheckoutComponent, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.basket?.c_orderData === nextProps.basket?.c_orderData &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.locale?.id === nextProps.locale?.id
    )
})
