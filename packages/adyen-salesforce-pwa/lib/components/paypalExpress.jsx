import React, {useEffect, useRef, useMemo, useCallback, useState} from 'react'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import PropTypes from 'prop-types'
import {AdyenCheckout, PayPal} from '@adyen/adyen-web'
import '../style/adyenCheckout.css'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import useAdyenPaymentMethodsForExpress from '../hooks/useAdyenPaymentMethodsForExpress'
import {AdyenShippingMethodsService} from '../services/shipping-methods'
import {paypalExpressConfig} from './paypal/expressConfig'

/**
 * PayPal Express Checkout Component
 *
 * Renders a PayPal Express button that enables fast checkout without requiring
 * customers to enter shipping and billing information manually. The component
 * handles the complete PayPal Express flow including:
 * - Fetching Adyen environment configuration and payment methods
 * - Initializing the Adyen Checkout SDK with PayPal Express configuration
 * - Managing shipping address and shipping method updates
 * - Processing payment authorization and submission
 * - Handling payment details and redirects
 *
 * The component provides lifecycle hooks (before/after callbacks) at each stage
 * of the payment flow for custom business logic integration.
 *
 * @component
 * @param {object} props - Component properties
 * @param {object} props.locale - Locale object with id property (e.g., {id: 'en-US'})
 * @param {object} props.site - Site configuration object
 * @param {object} props.basket - Shopping basket/cart object
 * @param {Function} props.navigate - Navigation function for redirects
 * @param {Function[]} [props.beforeSubmit] - Callbacks executed before payment submission
 * @param {Function[]} [props.afterSubmit] - Callbacks executed after payment submission
 * @param {Function[]} [props.beforeAdditionalDetails] - Callbacks executed before additional payment details
 * @param {Function[]} [props.afterAdditionalDetails] - Callbacks executed after additional payment details
 * @param {Function[]} [props.beforeAuthorized] - Callbacks executed before payment authorization
 * @param {Function[]} [props.afterAuthorized] - Callbacks executed after payment authorization
 * @param {Function[]} [props.beforeShippingAddressChange] - Callbacks executed before shipping address changes
 * @param {Function[]} [props.afterShippingAddressChange] - Callbacks executed after shipping address changes
 * @param {Function[]} [props.beforeShippingOptionsChange] - Callbacks executed before shipping method selection
 * @param {Function[]} [props.afterShippingOptionsChange] - Callbacks executed after shipping method selection
 * @param {Function[]} [props.onError] - Error handler callbacks
 * @param {object} [props.configuration] - Additional PayPal configuration overrides
 * @param {React.ReactNode} [props.spinner] - Optional loading spinner component
 * @param {string} [props.type='cart'] - Express checkout type: 'pdp' for product detail page or 'cart' for cart page
 * @param {string} [props.currency] - Currency code (required when type is 'pdp')
 * @param {object} [props.product] - Product object (required when type is 'pdp')
 * @returns {React.ReactElement} The PayPal Express button component
 *
 * @example
 * <PayPalExpressComponent
 *   locale={{id: 'en-US'}}
 *   site={siteConfig}
 *   basket={currentBasket}
 *   navigate={navigate}
 *   beforeSubmit={[validateCart]}
 *   afterSubmit={[trackPayment]}
 *   onError={[handleError]}
 * />
 */
const PayPalExpressComponent = ({
    // Order and payment data
    basket: basketProp,

    // User data
    site: siteProp,
    locale: localeProp,
    navigate: navigateProp,

    // Callbacks - Payment flow
    beforeSubmit = [],
    afterSubmit = [],
    beforeAdditionalDetails = [],
    afterAdditionalDetails = [],

    // Callbacks - Authorization
    beforeAuthorized = [],
    afterAuthorized = [],

    // Callbacks - Shipping
    beforeShippingAddressChange = [],
    afterShippingAddressChange = [],
    beforeShippingOptionsChange = [],
    afterShippingOptionsChange = [],

    // Error handling
    onError = [],

    // UI
    spinner,
    enableReview = false,
    reviewPageUrl = '/checkout/review',

    // Optional overrides
    configuration = {},

    // Express checkout type
    type = 'cart',
    currency,
    product,
    authToken: authTokenProp,
    customerId: customerIdProp
}) => {
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

    const isPdp = type === 'pdp'
    const shopperBasket = useMemo(
        () => (isPdp ? {currency, orderTotal: product?.price * (product?.quantity || 1)} : basket),
        [isPdp, currency, basket, basket?.orderTotal, basket?.basketId, product]
    )
    const basketId = shopperBasket?.basketId
    const paymentContainer = useRef(null)
    const paypalButtonRef = useRef(null)
    const errorShownRef = useRef(false)

    // Tracks whether a payment flow is currently in progress so we don't
    // tear down the SDK (and thus the popup) while it's running.
    const paymentActiveRef = useRef(false)

    // Use refs to store callbacks so effect doesn't depend on their identities
    const callbacksRef = useRef({})

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

    const cartPaymentMethods = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId,
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

    const isLoading = useMemo(
        () => isLoadingEnvironment || isLoadingPaymentMethods,
        [isLoadingEnvironment, isLoadingPaymentMethods]
    )

    const hasPayPalMethod = useMemo(() => {
        return adyenPaymentMethods?.paymentMethods?.some((method) => method.type === 'paypal')
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
    // doesn't tear down the SDK while a popup/flow is still in progress.
    const markPaymentActive = useCallback(() => {
        paymentActiveRef.current = true
    }, [])
    const markPaymentInactive = useCallback(() => {
        paymentActiveRef.current = false
    }, [])
    const markPaymentInactiveIfFinal = useCallback((state) => {
        if (!state?.action) {
            paymentActiveRef.current = false
        }
    }, [])

    // Update callback refs after all callbacks are defined.
    // We append our flag-management callbacks so user callbacks always run first.
    callbacksRef.current = {
        beforeSubmit: [...beforeSubmit, markPaymentActive],
        afterSubmit: [...afterSubmit, markPaymentInactiveIfFinal],
        beforeAdditionalDetails,
        afterAdditionalDetails: [...afterAdditionalDetails, markPaymentInactiveIfFinal],
        beforeAuthorized,
        afterAuthorized: [...afterAuthorized, markPaymentInactive],
        beforeShippingAddressChange: [...beforeShippingAddressChange, markPaymentActive],
        afterShippingAddressChange,
        beforeShippingOptionsChange,
        afterShippingOptionsChange,
        onError: [...onError, markPaymentInactive],
        navigate,
        fetchShippingMethods
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
        // Don't re-init while a payment flow is in progress — replacing the
        // PayPal SDK mid-flow invalidates its session and causes a 403 on the
        // PayPal orders endpoint when the user confirms in the popup.
        if (paymentActiveRef.current) {
            return
        }
        if (window?.paypal?.firstElementChild) {
            window.paypal = undefined
        }
        const initializeCheckout = async () => {
            const shouldInitialize = !!(
                adyenEnvironment &&
                adyenPaymentMethods &&
                (isPdp ? product : basket) &&
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
                    basket: shopperBasket,
                    site,
                    locale,
                    navigate: callbacksRef.current.navigate,
                    beforeSubmit: callbacksRef.current.beforeSubmit,
                    afterSubmit: callbacksRef.current.afterSubmit,
                    beforeAdditionalDetails: callbacksRef.current.beforeAdditionalDetails,
                    afterAdditionalDetails: callbacksRef.current.afterAdditionalDetails,
                    beforeAuthorized: callbacksRef.current.beforeAuthorized,
                    afterAuthorized: callbacksRef.current.afterAuthorized,
                    beforeShippingAddressChange: callbacksRef.current.beforeShippingAddressChange,
                    afterShippingAddressChange: callbacksRef.current.afterShippingAddressChange,
                    beforeShippingOptionsChange: callbacksRef.current.beforeShippingOptionsChange,
                    afterShippingOptionsChange: callbacksRef.current.afterShippingOptionsChange,
                    configuration,
                    onError: callbacksRef.current.onError,
                    fetchShippingMethods: callbacksRef.current.fetchShippingMethods,
                    enableReview,
                    reviewPageUrl,
                    type,
                    product
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
                if (!errorShownRef.current) {
                    errorShownRef.current = true
                    callbacksRef.current.onError.forEach((cb) => cb(err))
                }
            }
        }

        initializeCheckout()

        return () => {
            // Skip teardown while a payment flow is active so we don't kill
            // the popup that the SDK has just opened.
            if (paymentActiveRef.current) {
                return
            }
            if (paypalButtonRef.current) {
                try {
                    paypalButtonRef.current.unmount()
                    if (
                        window.paypal &&
                        typeof window.paypal.__internal_destroy__ === 'function'
                    ) {
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
        basket?.basketId,
        basket?.orderTotal,
        locale?.id,
        authToken,
        site?.id,
        hasPayPalMethod,
        enableReview,
        reviewPageUrl,
        type,
        product?.id,
        product?.price,
        product?.quantity
    ])

    // Always tear down on the component's actual unmount, regardless of any
    // active payment flow (covers navigation away, etc.).
    useEffect(() => {
        return () => {
            if (paypalButtonRef.current) {
                try {
                    paypalButtonRef.current.unmount()
                    if (
                        window.paypal &&
                        typeof window.paypal.__internal_destroy__ === 'function'
                    ) {
                        window.paypal.__internal_destroy__()
                    }
                } catch (e) {
                    // noop
                }
                paypalButtonRef.current = null
            }
        }
    }, [])

    return (
        <>
            {isLoading && spinner && <>{spinner}</>}
            <div className="adyen-paypal-express-button-container" ref={paymentContainer}></div>
        </>
    )
}

PayPalExpressComponent.propTypes = {
    // Optional props (fetched from retail-react-app hooks if not provided)
    locale: PropTypes.object,
    site: PropTypes.object,
    basket: PropTypes.object,
    navigate: PropTypes.func,

    beforeSubmit: PropTypes.arrayOf(PropTypes.func),
    afterSubmit: PropTypes.arrayOf(PropTypes.func),
    beforeAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    afterAdditionalDetails: PropTypes.arrayOf(PropTypes.func),
    beforeAuthorized: PropTypes.arrayOf(PropTypes.func),
    afterAuthorized: PropTypes.arrayOf(PropTypes.func),
    beforeShippingAddressChange: PropTypes.arrayOf(PropTypes.func),
    afterShippingAddressChange: PropTypes.arrayOf(PropTypes.func),
    beforeShippingOptionsChange: PropTypes.arrayOf(PropTypes.func),
    afterShippingOptionsChange: PropTypes.arrayOf(PropTypes.func),
    onError: PropTypes.arrayOf(PropTypes.func),
    configuration: PropTypes.object,
    spinner: PropTypes.node,
    type: PropTypes.oneOf(['pdp', 'cart']),
    currency: PropTypes.string,
    product: PropTypes.object,
    authToken: PropTypes.string,
    customerId: PropTypes.string
}

export default React.memo(PayPalExpressComponent, (prevProps, nextProps) => {
    return (
        prevProps.locale?.id === nextProps.locale?.id &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.basket?.orderTotal === nextProps.basket?.orderTotal &&
        prevProps.navigate === nextProps.navigate &&
        prevProps.type === nextProps.type &&
        prevProps.currency === nextProps.currency &&
        prevProps.product?.id === nextProps.product?.id &&
        prevProps.product?.quantity === nextProps.product?.quantity
    )
})
