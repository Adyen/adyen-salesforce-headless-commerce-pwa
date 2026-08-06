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
import {shouldNotifyError} from '../utils/executeCallbacks'
import {ERROR_NOTIFICATION_KEYS} from '../utils/constants.mjs'

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

    // Resolve props with hook fallbacks
    const {site: hookSite, locale: hookLocale} = useMultiSite()
    const hookNavigate = useNavigation()
    const {data: hookBasket} = useCurrentBasket()

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
    const [remountKey, setRemountKey] = useState(0)

    const handlePaymentCancel = useCallback(() => {
        setRemountKey((prev) => prev + 1)
    }, [])

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

    useEffect(() => {
        if (adyenEnvironmentError && shouldNotifyError(ERROR_NOTIFICATION_KEYS.GOOGLE_PAY_EXPRESS)) {
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            onError.forEach((cb) => cb(adyenEnvironmentError))
        }
    }, [adyenEnvironmentError, onError])

    useEffect(() => {
        if (adyenPaymentMethodsError && shouldNotifyError(ERROR_NOTIFICATION_KEYS.GOOGLE_PAY_EXPRESS)) {
            console.error('Error fetching Adyen payment methods:', adyenPaymentMethodsError)
            onError.forEach((cb) => cb(adyenPaymentMethodsError))
        }
    }, [adyenPaymentMethodsError, onError])

    useEffect(() => {
        if (shippingMethodsError && shouldNotifyError(ERROR_NOTIFICATION_KEYS.GOOGLE_PAY_EXPRESS)) {
            console.error('Error fetching shipping methods:', shippingMethodsError)
            onError.forEach((cb) => cb(shippingMethodsError))
        }
    }, [shippingMethodsError, onError])

    useEffect(() => {
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
                    navigate,
                    fetchShippingMethods,
                    onError,
                    onPaymentCancel: handlePaymentCancel,
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
                if (shouldNotifyError(ERROR_NOTIFICATION_KEYS.GOOGLE_PAY_EXPRESS)) {
                    onError.forEach((cb) => cb(err))
                }
            }
        }

        initializeCheckout()

        return () => {
            if (googlePayButtonRef.current) {
                googlePayButtonRef.current.unmount()
                googlePayButtonRef.current = null
            }
        }
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        adyenPaymentMethods?.paymentMethods,
        adyenPaymentMethods?.applicationInfo,
        shopperBasket?.basketId,
        shippingMethods?.applicableShippingMethods,
        locale?.id,
        authToken,
        site?.id,
        navigate,
        fetchShippingMethods,
        product,
        remountKey
    ])

    return (
        <>
            {isLoading && spinner && <>{spinner}</>}
            <div ref={paymentContainer}></div>
        </>
    )
}

GooglePayExpressComponent.propTypes = {
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
