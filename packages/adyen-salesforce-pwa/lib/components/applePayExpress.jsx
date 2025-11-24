import React, {useEffect, useRef, useCallback, useMemo, useState} from 'react'
import PropTypes from 'prop-types'
import {AdyenCheckout, ApplePay} from '@adyen/adyen-web'
import '@adyen/adyen-web/styles/adyen.css'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import useAdyenShippingMethods from '../hooks/useAdyenShippingMethods'
import {getAppleButtonConfig, getApplePaymentMethodConfig} from './helpers/applePayExpress.utils'
import {AdyenShippingMethodsService} from '../services/shipping-methods'
import useAdyenTemporaryBasket from '../hooks/useAdyenTemporaryBasket'

const ApplePayExpressComponent = (props) => {
    const {
        authToken,
        customerId,
        locale,
        site,
        basket,
        navigate,
        onError = [],
        isExpressPdp = false,
        product = null,
        merchantDisplayName = ''
    } = props
    const {temporaryBasket, createTemporaryBasket} = useAdyenTemporaryBasket({
        authToken,
        customerId,
        site,
        isExpressPdp
    })
    const [shopperBasket, setShopperBasket] = useState(isExpressPdp ? temporaryBasket : basket)
    const hasInitializedBasket = useRef(false)

    // Initialize temporary basket when all required data is available
    useEffect(() => {
        const initializeTemporaryBasket = async () => {
            if (isExpressPdp && !hasInitializedBasket.current && product && !temporaryBasket) {
                hasInitializedBasket.current = true
                try {
                    await createTemporaryBasket(product)
                } catch (error) {
                    hasInitializedBasket.current = false
                }
            }
        }

        initializeTemporaryBasket()
    }, [isExpressPdp, product, temporaryBasket, createTemporaryBasket])

    // Update shopperBasket when temporaryBasket changes
    useEffect(() => {
        if (isExpressPdp && temporaryBasket) {
            setShopperBasket(temporaryBasket)
        }
    }, [isExpressPdp, temporaryBasket])
    const paymentContainer = useRef(null)
    const applePayButtonRef = useRef(null)

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
    const {
        data: adyenPaymentMethods,
        error: adyenPaymentMethodsError,
        isLoading: isLoadingPaymentMethods
    } = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId: shopperBasket?.basketId,
        site,
        locale
    })

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

    const fetchShippingMethods = useCallback(async () => {
        // Fetch fresh shipping methods from API after address update
        const adyenShippingMethodsService = new AdyenShippingMethodsService(
            authToken,
            customerId,
            shopperBasket?.basketId,
            site
        )
        return await adyenShippingMethodsService.getShippingMethods()
    }, [authToken, customerId, shopperBasket?.basketId, site])

    // Handle errors from hooks
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
        if (shippingMethodsError) {
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
                    shopperBasket,
                    shippingMethods?.applicableShippingMethods,
                    applePaymentMethodConfig,
                    navigate,
                    fetchShippingMethods,
                    onError,
                    isExpressPdp,
                    product,
                    merchantDisplayName
                )
                const applePayButton = new ApplePay(checkout, appleButtonConfig)
                applePayButton
                    .isAvailable()
                    .then(() => {
                        if (applePayButtonRef.current) {
                            applePayButtonRef.current.unmount()
                        }
                        applePayButton.mount(paymentContainer.current)
                        applePayButtonRef.current = applePayButton
                    })
                    .catch(() => {})
            } catch (err) {
                console.error('Error initializing Apple Pay Express:', err)
                onError.forEach((cb) => cb(err))
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
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        adyenPaymentMethods?.paymentMethods,
        shopperBasket?.basketId,
        shippingMethods?.applicableShippingMethods,
        locale?.id,
        authToken,
        site?.id,
        navigate,
        fetchShippingMethods,
        createTemporaryBasket
    ])

    const {spinner} = props
    return (
        <>
            {isLoading && spinner && (
                <div className="adyen-checkout-spinner-container">{spinner}</div>
            )}
            <div ref={paymentContainer}></div>
        </>
    )
}

ApplePayExpressComponent.propTypes = {
    authToken: PropTypes.string.isRequired,
    customerId: PropTypes.string,
    locale: PropTypes.object.isRequired,
    site: PropTypes.object.isRequired,
    basket: PropTypes.object.isRequired,
    navigate: PropTypes.func.isRequired,
    onError: PropTypes.arrayOf(PropTypes.func),
    spinner: PropTypes.node,
    isExpressPdp: PropTypes.bool,
    product: PropTypes.object,
    merchantDisplayName: PropTypes.string
}

export default React.memo(ApplePayExpressComponent, (prevProps, nextProps) => {
    // Prevent unnecessary re-renders by comparing only relevant props
    return (
        prevProps.authToken === nextProps.authToken &&
        prevProps.customerId === nextProps.customerId &&
        prevProps.locale?.id === nextProps.locale?.id &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.navigate === nextProps.navigate
    )
})
