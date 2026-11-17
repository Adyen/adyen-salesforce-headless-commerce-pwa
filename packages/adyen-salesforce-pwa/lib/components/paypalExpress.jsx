import React, {useEffect, useRef, useMemo, useCallback, useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
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
import {shouldNotifyError} from '../utils/executeCallbacks'
import {ERROR_NOTIFICATION_KEYS} from '../utils/constants.mjs'
import {getCurrencyValueForApi} from '../utils/parsers.mjs'

const canMountPayPalButton = async (paypalButton, isCurrent) => {
    if (typeof paypalButton.isAvailable !== 'function') {
        return isCurrent()
    }

    try {
        await paypalButton.isAvailable()
        return isCurrent()
    } catch (err) {
        if (isCurrent()) {
            console.warn('PayPal Express is not available:', err)
        }
        return false
    }
}

const clearPayPalDomNamespaceCollision = () => {
    const paypalNamespace = window.paypal
    const isDomNamespace =
        (window.Element && paypalNamespace instanceof window.Element) ||
        (window.HTMLCollection && paypalNamespace instanceof window.HTMLCollection)

    if (isDomNamespace) {
        window.paypal = undefined
    }
}

const unmountPayPalButton = (paypalButton) => {
    const loadedScripts = Array.from(
        document.querySelectorAll('script[src*="paypal.com/sdk/js"][data-script-loaded="true"]')
    ).map((script) => ({
        script,
        parent: script.parentNode,
        nextSibling: script.nextSibling
    }))

    paypalButton.unmount()

    loadedScripts.forEach(({script, parent, nextSibling}) => {
        if (!script.isConnected && parent?.isConnected) {
            parent.insertBefore(script, nextSibling?.isConnected ? nextSibling : null)
        }
    })
}

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
    const queryClient = useQueryClient()

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
    const initializationRef = useRef(null)
    const isUnmountedRef = useRef(false)
    const latestBasketRef = useRef(shopperBasket)
    const latestProductRef = useRef(product)
    latestBasketRef.current = shopperBasket
    latestProductRef.current = product
    const [remountKey, setRemountKey] = useState(0)

    // A cancelled PDP payment leaves the button in a finished state; tear it down so the
    // init effect builds a fresh one with a clean temporary-basket context.
    const handlePaymentCancel = useCallback(() => {
        if (paypalButtonRef.current) {
            try {
                unmountPayPalButton(paypalButtonRef.current)
            } catch (e) {
                console.error('Error unmounting paypalButton:', e)
            }
            paypalButtonRef.current = null
        }
        initializationRef.current = null
        setRemountKey((prev) => prev + 1)
    }, [])

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

    useEffect(() => {
        if (adyenEnvironmentError && shouldNotifyError(ERROR_NOTIFICATION_KEYS.PAYPAL_EXPRESS)) {
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            onError.forEach((cb) => cb(adyenEnvironmentError))
        }
    }, [adyenEnvironmentError, onError])

    useEffect(() => {
        if (adyenPaymentMethodsError && shouldNotifyError(ERROR_NOTIFICATION_KEYS.PAYPAL_EXPRESS)) {
            console.error('Error fetching Adyen payment methods:', adyenPaymentMethodsError)
            onError.forEach((cb) => cb(adyenPaymentMethodsError))
        }
    }, [adyenPaymentMethodsError, onError])

    useEffect(() => {
        clearPayPalDomNamespaceCollision()
        const initializeCheckout = async () => {
            const shouldInitialize = !!(
                adyenEnvironment &&
                adyenPaymentMethods &&
                authToken &&
                (isPdp ? product : basket) &&
                hasPayPalMethod &&
                paymentContainer.current
            )

            if (!shouldInitialize || paypalButtonRef.current || initializationRef.current) {
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
                if (isUnmountedRef.current) {
                    return
                }

                const expressConfig = paypalExpressConfig({
                    token: authToken,
                    customerId,
                    basket: shopperBasket,
                    site,
                    locale,
                    navigate,
                    beforeSubmit,
                    afterSubmit,
                    beforeAdditionalDetails,
                    afterAdditionalDetails,
                    beforeAuthorized,
                    afterAuthorized,
                    beforeShippingAddressChange,
                    afterShippingAddressChange,
                    beforeShippingOptionsChange,
                    afterShippingOptionsChange,
                    configuration,
                    onError,
                    onPaymentCancel: isPdp ? handlePaymentCancel : undefined,
                    fetchShippingMethods,
                    enableReview,
                    reviewPageUrl,
                    type,
                    product,
                    queryClient,
                    getLatestBasket: () => latestBasketRef.current,
                    getLatestProduct: () => latestProductRef.current
                })

                const paypalButton = new PayPal(checkout, expressConfig)

                const mountPayPalButton = () => {
                    paypalButton.mount(paymentContainer.current)
                    paypalButtonRef.current = paypalButton
                }

                if (!(await canMountPayPalButton(paypalButton, () => !isUnmountedRef.current))) {
                    return
                }
                mountPayPalButton()
            } catch (err) {
                if (isUnmountedRef.current) {
                    return
                }
                console.error('Error initializing PayPal Express:', err)
                if (shouldNotifyError(ERROR_NOTIFICATION_KEYS.PAYPAL_EXPRESS)) {
                    onError.forEach((cb) => cb(err))
                }
            } finally {
                if (!paypalButtonRef.current) {
                    initializationRef.current = null
                }
            }
        }

        initializationRef.current = initializeCheckout().finally(() => {
            if (!paypalButtonRef.current) {
                initializationRef.current = null
            }
        })
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        adyenPaymentMethods,
        authToken,
        basket,
        product,
        hasPayPalMethod,
        remountKey
    ])

    useEffect(() => {
        isUnmountedRef.current = false
        return () => {
            isUnmountedRef.current = true
            initializationRef.current = null
            if (paypalButtonRef.current) {
                try {
                    unmountPayPalButton(paypalButtonRef.current)
                } catch (e) {
                    console.error('Error unmounting paypalButton:', e)
                }
                paypalButtonRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        if (
            typeof paypalButtonRef.current?.updateAmount !== 'function' ||
            shopperBasket?.orderTotal == null ||
            !shopperBasket?.currency
        ) {
            return
        }

        paypalButtonRef.current.updateAmount({
            value: getCurrencyValueForApi(shopperBasket.orderTotal, shopperBasket.currency),
            currency: shopperBasket.currency
        })
    }, [shopperBasket?.orderTotal, shopperBasket?.currency])

    return (
        <>
            {isLoading && spinner && <>{spinner}</>}
            <div className="adyen-paypal-express-button-container" ref={paymentContainer}></div>
        </>
    )
}

PayPalExpressComponent.propTypes = {
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
    enableReview: PropTypes.bool,
    reviewPageUrl: PropTypes.string,
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
