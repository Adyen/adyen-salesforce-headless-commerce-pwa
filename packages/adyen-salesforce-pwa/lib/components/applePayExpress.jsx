import React, {useEffect, useRef, useCallback, useMemo, useState} from 'react'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import PropTypes from 'prop-types'
import {AdyenCheckout, ApplePay} from '@adyen/adyen-web'
import '../style/adyenCheckout.css'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import useAdyenPaymentMethodsForExpress from '../hooks/useAdyenPaymentMethodsForExpress'
import useAdyenShippingMethods from '../hooks/useAdyenShippingMethods'
import {getAppleButtonConfig, getApplePaymentMethodConfig} from './helpers/applePayExpress.utils'
import {AdyenShippingMethodsService} from '../services/shipping-methods'

const ApplePayExpressComponent = (props) => {
    const {
        locale: localeProp,
        site: siteProp,
        basket: basketProp,
        navigate: navigateProp,
        onError = [],
        currency,
        isExpressPdp = false,
        merchantDisplayName = '',
        product,
        authToken: authTokenProp,
        customerId: customerIdProp
    } = props

    // Use retail-react-app hooks for default values
    const {locale: hookLocale, site: hookSite} = useMultiSite()
    const hookNavigate = useNavigation()
    const {data: hookBasket, refetch: refetchBasket} = useCurrentBasket()

    // Props override hook values
    const site = siteProp ?? hookSite
    const locale = localeProp ?? hookLocale
    const navigate = navigateProp ?? hookNavigate
    const basket = basketProp ?? hookBasket

    const hookCustomerId = useCustomerId()
    const customerId = customerIdProp || hookCustomerId
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
    const isPdp = isExpressPdp === true
    const shopperBasket = useMemo(
        () => (isPdp ? {currency, orderTotal: product?.price * (product?.quantity || 1)} : basket),
        [isPdp, currency, basket, basket?.orderTotal, basket?.basketId, product]
    )
    const paymentContainer = useRef(null)
    const applePayButtonRef = useRef(null)
    const errorShownRef = useRef(false)

    // Tracks whether an Apple Pay session is currently active so we don't
    // tear down the button (and thus the sheet) while it's running.
    const paymentActiveRef = useRef(false)

    // Store callbacks in ref to avoid unnecessary re-initialization when callback identities change
    const callbacksRef = useRef({})

    // Fetch Adyen environment
    const {
        data: adyenEnvironment,
        error: adyenEnvironmentError,
        isLoading: isLoadingEnvironment
    } = useAdyenEnvironment({
        authToken,
        customerId,
        basketId: shopperBasket?.basketId,
        site
    })

    // Fetch payment methods
    const cartPaymentMethods = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId: shopperBasket?.basketId,
        site,
        locale,
        skip: isPdp
    })
    const pdpPaymentMethods = useAdyenPaymentMethodsForExpress({
        authToken,
        customerId,
        site,
        locale,
        currency,
        skip: !isPdp
    })
    const {
        data: adyenPaymentMethods,
        error: adyenPaymentMethodsError,
        isLoading: isLoadingPaymentMethods
    } = isPdp ? pdpPaymentMethods : cartPaymentMethods

    // Fetch shipping methods
    const {
        data: shippingMethods,
        error: shippingMethodsError,
        isLoading: isLoadingShippingMethods
    } = useAdyenShippingMethods({
        authToken,
        customerId,
        basketId: shopperBasket?.basketId,
        site,
        skip: !shopperBasket?.basketId
    })

    // Memoize loading state
    const isLoading = useMemo(
        () => isLoadingEnvironment || isLoadingPaymentMethods || isLoadingShippingMethods,
        [isLoadingEnvironment, isLoadingPaymentMethods, isLoadingShippingMethods]
    )

    const hasApplePayMethod = useMemo(() => {
        return adyenPaymentMethods?.paymentMethods?.some((method) => method.type === 'applepay')
    }, [adyenPaymentMethods?.paymentMethods])

    const fetchShippingMethods = useCallback(
        async (basketId) => {
            // Fetch fresh shipping methods from API after address update
            const adyenShippingMethodsService = new AdyenShippingMethodsService(
                authToken,
                customerId,
                basketId,
                site
            )
            return await adyenShippingMethodsService.getShippingMethods()
        },
        [authToken, customerId, site]
    )

    // Helpers to flip the payment-active flag so the init effect's cleanup
    // doesn't tear down the button while a sheet/flow is still in progress.
    const markPaymentActive = useCallback(() => {
        paymentActiveRef.current = true
    }, [])
    const markPaymentInactive = useCallback(() => {
        paymentActiveRef.current = false
    }, [])

    // Update callback refs after all callbacks are defined.
    // Wrap fetchShippingMethods to flag a session in progress, and onError to clear it.
    const wrappedFetchShippingMethods = useCallback(
        async (basketId) => {
            markPaymentActive()
            return await fetchShippingMethods(basketId)
        },
        [fetchShippingMethods, markPaymentActive]
    )
    callbacksRef.current = {
        navigate,
        fetchShippingMethods: wrappedFetchShippingMethods,
        onError: [...onError, markPaymentInactive]
    }

    // Handle errors from hooks
    useEffect(() => {
        if (adyenEnvironmentError && !errorShownRef.current) {
            errorShownRef.current = true
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            callbacksRef.current.onError.forEach((cb) => cb(adyenEnvironmentError))
        }
    }, [adyenEnvironmentError])

    useEffect(() => {
        if (adyenPaymentMethodsError && !errorShownRef.current) {
            errorShownRef.current = true
            console.error('Error fetching Adyen payment methods:', adyenPaymentMethodsError)
            callbacksRef.current.onError.forEach((cb) => cb(adyenPaymentMethodsError))
        }
    }, [adyenPaymentMethodsError])

    useEffect(() => {
        if (shippingMethodsError && !errorShownRef.current) {
            errorShownRef.current = true
            console.error('Error fetching shipping methods:', shippingMethodsError)
            callbacksRef.current.onError.forEach((cb) => cb(shippingMethodsError))
        }
    }, [shippingMethodsError])

    useEffect(() => {
        // Don't re-init while a payment flow is in progress — recreating the
        // Apple Pay button would invalidate the active sheet's session.
        if (paymentActiveRef.current) {
            return
        }
        const initializeCheckout = async () => {
            const shouldInitialize = !!(
                adyenEnvironment &&
                adyenPaymentMethods &&
                shopperBasket &&
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

                const appleButtonConfig = getAppleButtonConfig({
                    token: authToken,
                    site,
                    basket: shopperBasket,
                    shippingMethods: shippingMethods?.applicableShippingMethods,
                    applePayConfig: applePaymentMethodConfig,
                    navigate: callbacksRef.current.navigate,
                    fetchShippingMethods: callbacksRef.current.fetchShippingMethods,
                    onError: callbacksRef.current.onError,
                    isExpressPdp,
                    merchantDisplayName,
                    customerId,
                    product,
                    locale
                })
                const applePayButton = new ApplePay(checkout, appleButtonConfig)
                await applePayButton.isAvailable()
                if (applePayButtonRef.current) {
                    applePayButtonRef.current.unmount()
                }
                applePayButton.mount(paymentContainer.current)
                applePayButtonRef.current = applePayButton
            } catch (err) {
                console.error('Error initializing Apple Pay Express:', err)
                if (!errorShownRef.current) {
                    errorShownRef.current = true
                    callbacksRef.current.onError.forEach((cb) => cb(err))
                }
            }
        }

        initializeCheckout()

        return () => {
            // Skip teardown while a payment flow is active so we don't kill
            // the Apple Pay sheet that's currently presenting.
            if (paymentActiveRef.current) {
                return
            }
            if (applePayButtonRef.current) {
                applePayButtonRef.current.unmount()
                applePayButtonRef.current = null
            }
        }
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        hasApplePayMethod,
        shopperBasket?.basketId,
        shopperBasket?.orderTotal,
        shippingMethods?.applicableShippingMethods?.length,
        locale?.id,
        authToken,
        site?.id,
        product?.id,
        product?.price,
        product?.quantity,
        isExpressPdp,
        merchantDisplayName,
        customerId
    ])

    // Always tear down on the component's actual unmount, regardless of any
    // active payment flow (covers navigation away, etc.).
    useEffect(() => {
        return () => {
            if (applePayButtonRef.current) {
                try {
                    applePayButtonRef.current.unmount()
                } catch (e) {
                    // noop
                }
                applePayButtonRef.current = null
            }
        }
    }, [])

    const {spinner} = props
    return (
        <>
            {isLoading && spinner && <>{spinner}</>}
            <div ref={paymentContainer}></div>
        </>
    )
}

ApplePayExpressComponent.propTypes = {
    // Optional props (fetched from retail-react-app hooks if not provided)
    locale: PropTypes.object,
    site: PropTypes.object,
    basket: PropTypes.object,
    navigate: PropTypes.func,

    onError: PropTypes.arrayOf(PropTypes.func),
    spinner: PropTypes.node,
    isExpressPdp: PropTypes.bool,
    currency: PropTypes.string,
    merchantDisplayName: PropTypes.string,
    product: PropTypes.object,
    authToken: PropTypes.string,
    customerId: PropTypes.string
}

export default React.memo(ApplePayExpressComponent, (prevProps, nextProps) => {
    // Prevent unnecessary re-renders by comparing only relevant props
    return (
        prevProps.locale?.id === nextProps.locale?.id &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.basket?.orderTotal === nextProps.basket?.orderTotal &&
        prevProps.navigate === nextProps.navigate &&
        prevProps.product?.id === nextProps.product?.id &&
        prevProps.product?.quantity === nextProps.product?.quantity
    )
})
