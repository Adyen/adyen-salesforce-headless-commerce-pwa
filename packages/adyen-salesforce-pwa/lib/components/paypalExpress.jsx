import React, {useEffect, useRef, useMemo, useCallback} from 'react'
import PropTypes from 'prop-types'
import {AdyenCheckout, PayPal} from '@adyen/adyen-web'
import '../style/adyenCheckout.css'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
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
 * @param {string} props.authToken - Authentication token for API requests
 * @param {string} [props.customerId] - Customer ID for the current shopper
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
 * @returns {React.ReactElement} The PayPal Express button component
 *
 * @example
 * <PayPalExpressComponent
 *   authToken={token}
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
    basket,

    // User data
    authToken,
    customerId,
    site,
    locale,
    navigate,

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
    configuration = {}
}) => {
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

    const fetchShippingMethods = useCallback(async () => {
        // Fetch fresh shipping methods from API after address update
        const adyenShippingMethodsService = new AdyenShippingMethodsService(
            authToken,
            customerId,
            basketId,
            site
        )
        return await adyenShippingMethodsService.getShippingMethods()
    }, [authToken, customerId, basketId, site])

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
                    beforeAuthorized,
                    afterAuthorized,
                    beforeShippingAddressChange,
                    afterShippingAddressChange,
                    beforeShippingOptionsChange,
                    afterShippingOptionsChange,
                    configuration,
                    onError,
                    fetchShippingMethods,
                    enableReview,
                    reviewPageUrl
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
        beforeAuthorized,
        afterAuthorized,
        beforeShippingAddressChange,
        afterShippingAddressChange,
        beforeShippingOptionsChange,
        afterShippingOptionsChange,
        onError,
        navigate,
        enableReview,
        reviewPageUrl,
        fetchShippingMethods
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
    beforeAuthorized: PropTypes.arrayOf(PropTypes.func),
    afterAuthorized: PropTypes.arrayOf(PropTypes.func),
    beforeShippingAddressChange: PropTypes.arrayOf(PropTypes.func),
    afterShippingAddressChange: PropTypes.arrayOf(PropTypes.func),
    beforeShippingOptionsChange: PropTypes.arrayOf(PropTypes.func),
    afterShippingOptionsChange: PropTypes.arrayOf(PropTypes.func),
    onError: PropTypes.arrayOf(PropTypes.func),
    configuration: PropTypes.object,
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
