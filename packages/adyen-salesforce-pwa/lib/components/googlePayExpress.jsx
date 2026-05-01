import React, {useEffect, useRef, useCallback, useMemo, useState} from 'react'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import PropTypes from 'prop-types'
import {AdyenCheckout, GooglePay} from '@adyen/adyen-web'
import '../style/adyenCheckout.css'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import useAdyenPaymentMethodsForExpress from '../hooks/useAdyenPaymentMethodsForExpress'
import useAdyenShippingMethods from '../hooks/useAdyenShippingMethods'
import {getGooglePayExpressConfig} from './googlepay/expressConfig'
import {AdyenShippingMethodsService} from '../services/shipping-methods'

const GooglePayExpressComponent = (props) => {
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
        spinner,
        configuration = {},
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
    const googlePayButtonRef = useRef(null)
    const errorShownRef = useRef(false)
    const [remountKey, setRemountKey] = useState(0)

    // Tracks whether a Google Pay session is currently active so we don't
    // tear down the button (and thus the sheet) while it's running.
    const paymentActiveRef = useRef(false)

    const handlePaymentCancel = useCallback(() => {
        paymentActiveRef.current = false
        setRemountKey((prev) => prev + 1)
    }, [])

    // Store callbacks in ref to avoid unnecessary re-initialization when callback identities change
    const callbacksRef = useRef({})

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

    const isLoading = useMemo(
        () => isLoadingEnvironment || isLoadingPaymentMethods || isLoadingShippingMethods,
        [isLoadingEnvironment, isLoadingPaymentMethods, isLoadingShippingMethods]
    )

    const hasGooglePayMethod = useMemo(() => {
        return adyenPaymentMethods?.paymentMethods?.some((method) => method.type === 'googlepay')
    }, [adyenPaymentMethods?.paymentMethods])

    const fetchShippingMethods = useCallback(
        async (basketId) => {
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
    // doesn't tear down the button while a Google Pay sheet is presenting.
    const markPaymentActive = useCallback(() => {
        paymentActiveRef.current = true
    }, [])
    const markPaymentInactive = useCallback(() => {
        paymentActiveRef.current = false
    }, [])

    // Wrap fetchShippingMethods to flag a session in progress.
    const wrappedFetchShippingMethods = useCallback(
        async (basketId) => {
            markPaymentActive()
            return await fetchShippingMethods(basketId)
        },
        [fetchShippingMethods, markPaymentActive]
    )

    // Update callback refs after all callbacks are defined.
    callbacksRef.current = {
        navigate,
        fetchShippingMethods: wrappedFetchShippingMethods,
        onError: [...onError, markPaymentInactive],
        handlePaymentCancel
    }

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
        // Google Pay button would invalidate the active sheet's session.
        if (paymentActiveRef.current) {
            return
        }
        const initializeCheckout = async () => {
            // Reset error flag for fresh mount attempt
            errorShownRef.current = false

            const shouldInitialize = !!(
                adyenEnvironment &&
                adyenPaymentMethods &&
                shopperBasket &&
                paymentContainer.current
            )

            if (!shouldInitialize) {
                return
            }

            const googlePayMethod = adyenPaymentMethods?.paymentMethods?.find(
                (method) => method.type === 'googlepay'
            )
            if (!googlePayMethod) {
                return
            }
            const googlePayMethodConfig = googlePayMethod.configuration || {}

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

                const expressConfig = getGooglePayExpressConfig({
                    token: authToken,
                    customerId,
                    basket: shopperBasket,
                    site,
                    locale,
                    navigate: callbacksRef.current.navigate,
                    fetchShippingMethods: callbacksRef.current.fetchShippingMethods,
                    onError: callbacksRef.current.onError,
                    onPaymentCancel: callbacksRef.current.handlePaymentCancel,
                    googlePayMethodConfig,
                    configuration,
                    type: isPdp ? 'pdp' : 'cart',
                    product,
                    merchantDisplayName,
                    shippingMethods: shippingMethods?.applicableShippingMethods
                })

                const googlePayButton = new GooglePay(checkout, expressConfig)

                await googlePayButton.isAvailable()

                if (googlePayButtonRef.current) {
                    googlePayButtonRef.current.unmount()
                }
                googlePayButton.mount(paymentContainer.current)
                googlePayButtonRef.current = googlePayButton
            } catch (err) {
                console.error('Error initializing Google Pay Express:', err)
                if (!errorShownRef.current) {
                    errorShownRef.current = true
                    callbacksRef.current.onError.forEach((cb) => cb(err))
                }
            }
        }

        initializeCheckout()

        return () => {
            // Skip teardown while a payment flow is active so we don't kill
            // the Google Pay sheet that's currently presenting.
            if (paymentActiveRef.current) {
                return
            }
            if (googlePayButtonRef.current) {
                googlePayButtonRef.current.unmount()
                googlePayButtonRef.current = null
            }
        }
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        hasGooglePayMethod,
        shopperBasket?.basketId,
        shopperBasket?.orderTotal,
        shippingMethods?.applicableShippingMethods?.length,
        locale?.id,
        authToken,
        site?.id,
        product?.id,
        product?.price,
        product?.quantity,
        remountKey,
        isPdp,
        merchantDisplayName,
        customerId
    ])

    // Always tear down on the component's actual unmount, regardless of any
    // active payment flow (covers navigation away, etc.).
    useEffect(() => {
        return () => {
            if (googlePayButtonRef.current) {
                try {
                    googlePayButtonRef.current.unmount()
                } catch (e) {
                    // noop
                }
                googlePayButtonRef.current = null
            }
        }
    }, [])

    return (
        <>
            {isLoading && spinner && <>{spinner}</>}
            <div ref={paymentContainer}></div>
        </>
    )
}

GooglePayExpressComponent.propTypes = {
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
    configuration: PropTypes.object,
    authToken: PropTypes.string,
    customerId: PropTypes.string
}

export default React.memo(GooglePayExpressComponent, (prevProps, nextProps) => {
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
