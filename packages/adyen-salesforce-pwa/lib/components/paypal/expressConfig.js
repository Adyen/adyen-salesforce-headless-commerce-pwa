import {baseConfig, onSubmit, onAdditionalDetails} from '../helpers/baseConfig'
import {executeCallbacks, executeErrorCallbacks} from '../../utils/executeCallbacks'
import {PaymentCancelExpressService} from '../../services/payment-cancel-express'
import {AdyenShopperDetailsService} from '../../services/shopper-details'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenPaypalUpdateOrderService} from '../../services/paypal-update-order'
import {AdyenPaymentDataReviewPageService} from '../../services/payment-data-review-page'
import {AdyenTemporaryBasketService} from '../../services/temporary-basket'
import {formatPayPalShopperDetails} from '../helpers/addressHelper'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'

/**
 * Creates the PayPal Express configuration object for Adyen Checkout.
 * Combines base configuration with PayPal Express-specific settings and lifecycle callbacks.
 *
 * @param {object} [props={}] - Configuration properties
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
 * @param {object} [props.configuration] - Additional PayPal configuration overrides (e.g., buttonStyle, shippingPreference)
 * @returns {object} PayPal Express configuration object for Adyen Checkout
 */
export const paypalExpressConfig = (props = {}) => {
    const {
        beforeSubmit = [],
        afterSubmit = [],
        beforeAdditionalDetails = [],
        afterAdditionalDetails = [],
        beforeAuthorized = [],
        afterAuthorized = [],
        beforeShippingAddressChange = [],
        afterShippingAddressChange = [],
        beforeShippingOptionsChange = [],
        afterShippingOptionsChange = [],
        configuration = {},
        type = 'cart',
        onError = []
    } = props

    const isPdp = type === 'pdp'
    let currentBasket = props.basket

    const getBasket = () => currentBasket
    const setBasket = (basket) => {
        currentBasket = basket
    }

    const propsWithGetBasket = {...props, getBasket, setBasket}

    const errorHandler = (error, component) => onErrorHandler(error, component, propsWithGetBasket)

    const redirectShopperToReviewPage = async (state) => {
        try {
            const basket = getBasket()
            const {site, token} = props
            const adyenPaymentDataReviewPageService = new AdyenPaymentDataReviewPageService(
                token,
                basket?.customerInfo?.customerId,
                basket?.basketId,
                site
            )
            await adyenPaymentDataReviewPageService.setPaymentData(state.data)
            props.navigate(props.reviewPageUrl)
        } catch (err) {
            props.onError(err)
        }
    }
    return {
        ...baseConfig(propsWithGetBasket),
        showPayButton: true,
        isExpress: true,
        amount: {
            value: getCurrencyValueForApi(currentBasket?.orderTotal, currentBasket?.currency),
            currency: currentBasket?.currency
        },
        ...(props.enableReview && {userAction: 'continue'}),
        onSubmit: executeCallbacks(
            [
                ...beforeSubmit,
                ...(isPdp ? [createTemporaryBasketCallback] : []),
                onSubmit,
                ...afterSubmit,
                onPaymentsSuccess
            ],
            propsWithGetBasket
        ),
        onAdditionalDetails: props.enableReview
            ? redirectShopperToReviewPage
            : executeCallbacks(
                  [
                      ...beforeAdditionalDetails,
                      onAdditionalDetails,
                      ...afterAdditionalDetails,
                      onPaymentsDetailsSuccess
                  ],
                  propsWithGetBasket
              ),
        onAuthorized: executeCallbacks(
            [...beforeAuthorized, onAuthorized, ...afterAuthorized, onAuthorizedSuccess],
            propsWithGetBasket
        ),
        onShippingAddressChange: executeCallbacks(
            [
                ...beforeShippingAddressChange,
                onShippingAddressChange,
                ...afterShippingAddressChange
            ],
            propsWithGetBasket
        ),
        onShippingOptionsChange: executeCallbacks(
            [
                ...beforeShippingOptionsChange,
                onShippingOptionsChange,
                ...afterShippingOptionsChange
            ],
            propsWithGetBasket
        ),
        onError: executeErrorCallbacks([...onError, errorHandler], propsWithGetBasket),
        onPaymentFailed: executeErrorCallbacks([...onError, errorHandler], propsWithGetBasket),
        ...configuration
    }
}

/**
 * Creates a temporary basket for PDP express checkout.
 * This callback is executed as part of onSubmit, after beforeSubmit callbacks.
 *
 * @param {object} state - Current payment state
 * @param {object} component - Adyen component instance
 * @param {object} actions - Action handlers (resolve, reject)
 * @param {object} props - Component properties
 * @returns {Promise<void>}
 */
export const createTemporaryBasketCallback = async (state, component, actions, props) => {
    try {
        const {token, customerId, site, product, setBasket} = props
        const adyenTemporaryBasketService = new AdyenTemporaryBasketService(token, customerId, site)
        const temporaryBasket = await adyenTemporaryBasketService.createTemporaryBasket(product)
        if (temporaryBasket?.basketId) {
            setBasket(temporaryBasket)
        } else {
            throw new Error('Failed to create temporary basket')
        }
    } catch (err) {
        props.onError?.forEach((cb) => cb(err))
        actions.reject(err.message)
    }
}

/**
 * Handles successful payment response from Adyen.
 * If the response contains an action (e.g., 3DS challenge), it triggers the action handler.
 * Otherwise, resolves the payment flow.
 *
 * @param {object} state - Current payment state
 * @param {object} component - Adyen component instance
 * @param {object} actions - Action handlers (resolve, reject)
 * @param {object} props - Component properties
 * @param {object} responses - API responses
 * @param {object} [responses.paymentsResponse] - Payment response from Adyen
 * @param {object} [responses.paymentsResponse.action] - Additional action required (e.g., 3DS)
 */
export const onPaymentsSuccess = (state, component, actions, props, responses) => {
    try {
        if (responses?.paymentsResponse?.action) {
            component.handleAction(responses?.paymentsResponse?.action)
        }
        actions.resolve(responses?.paymentsResponse)
    } catch (err) {
        actions.reject(err.message)
    }
}

/**
 * Handles successful payment details response from Adyen.
 * Navigates to the order confirmation page if the payment is successful.
 *
 * @param {object} state - Current payment state
 * @param {object} component - Adyen component instance
 * @param {object} actions - Action handlers (resolve, reject)
 * @param {object} props - Component properties
 * @param {Function} props.navigate - Navigation function
 * @param {object} responses - API responses
 * @param {object} [responses.paymentsDetailsResponse] - Payment details response from Adyen
 * @param {boolean} [responses.paymentsDetailsResponse.isSuccessful] - Whether payment was successful
 * @param {string} [responses.paymentsDetailsResponse.merchantReference] - Order reference number
 */
export const onPaymentsDetailsSuccess = async (state, component, actions, props, responses) => {
    try {
        if (responses?.paymentsDetailsResponse?.isSuccessful) {
            props?.navigate(
                `/checkout/confirmation/${responses?.paymentsDetailsResponse?.merchantReference}`
            )
        }
        actions.resolve(responses?.paymentsDetailsResponse)
    } catch (err) {
        actions.reject(err.message)
    }
}

/**
 * Handles the PayPal authorization event.
 * Updates shopper details (email, name, phone) and addresses in the basket.
 *
 * @param {object} data - Authorization event data from PayPal
 * @param {object} data.authorizedEvent - PayPal authorization event details
 * @param {object} data.authorizedEvent.payer - Payer information from PayPal
 * @param {object} data.billingAddress - Billing address from PayPal
 * @param {object} data.deliveryAddress - Delivery address from PayPal
 * @param {object} actions - Action handlers (resolve, reject)
 * @param {object} props - Component properties
 * @param {string} props.token - Authentication token
 * @param {object} props.basket - Shopping basket object
 * @param {object} props.site - Site configuration
 * @returns {Promise<object>} Object containing shopperDetailsResponse
 */
export const onAuthorized = async (data, actions, props) => {
    try {
        const {
            authorizedEvent: {payer = {}},
            billingAddress,
            deliveryAddress
        } = data
        const basket = props.getBasket ? props.getBasket() : props.basket
        const {site, token} = props
        const shopperDetails = formatPayPalShopperDetails(payer, deliveryAddress, billingAddress)
        const adyenShopperDetailsService = new AdyenShopperDetailsService(
            token,
            basket?.customerInfo?.customerId,
            basket?.basketId,
            site
        )
        const shopperDetailsResponse =
            await adyenShopperDetailsService.updateShopperDetails(shopperDetails)
        return {shopperDetailsResponse: shopperDetailsResponse}
    } catch (err) {
        actions.reject(err.message)
    }
}

/**
 * Handles successful authorization completion.
 * Resolves the authorization flow to proceed with payment.
 *
 * @param {object} data - Authorization data
 * @param {object} actions - Action handlers (resolve, reject)
 */
export const onAuthorizedSuccess = (data, actions) => {
    try {
        actions.resolve()
    } catch (err) {
        actions.reject(err.message)
    }
}

/**
 * Handles shipping address changes during PayPal Express checkout.
 * Updates the shipping address, fetches applicable shipping methods,
 * sets the default shipping method, and updates the PayPal order with new amounts.
 *
 * @param {object} data - Shipping address change event data
 * @param {object} data.shippingAddress - New shipping address from PayPal
 * @param {object} data.errors - Error types for rejection
 * @param {object} actions - Action handlers (resolve, reject)
 * @param {object} component - Adyen component instance with paymentData
 * @param {object} props - Component properties
 * @param {string} props.token - Authentication token
 * @param {object} props.basket - Shopping basket object
 * @param {object} props.site - Site configuration
 * @param {Function} props.fetchShippingMethods - Function to fetch available shipping methods
 * @returns {Promise<void>}
 */
export const onShippingAddressChange = async (data, actions, component, props) => {
    try {
        const {shippingAddress} = data
        const currentPaymentData = component.paymentData
        const basket = props.getBasket ? props.getBasket() : props.basket
        const {site, token, fetchShippingMethods} = props
        if (!shippingAddress) {
            return actions.reject(data.errors.ADDRESS_ERROR)
        }
        const adyenShippingAddressService = new AdyenShippingAddressService(
            token,
            basket?.customerInfo?.customerId,
            basket?.basketId,
            site
        )
        const customerShippingDetails = formatPayPalShopperDetails(null, shippingAddress)
        await adyenShippingAddressService.updateShippingAddress(customerShippingDetails)
        const {defaultShippingMethodId, applicableShippingMethods} = await fetchShippingMethods(
            basket?.basketId
        )
        if (!applicableShippingMethods?.length) {
            return actions.reject(data.errors.ADDRESS_ERROR)
        } else {
            const adyenShippingMethodsService = new AdyenShippingMethodsService(
                token,
                basket?.customerInfo?.customerId,
                basket?.basketId,
                site
            )
            await adyenShippingMethodsService.updateShippingMethod(
                defaultShippingMethodId ? defaultShippingMethodId : applicableShippingMethods[0].id
            )
        }
        const adyenPaypalUpdateOrderService = new AdyenPaypalUpdateOrderService(
            token,
            basket?.customerInfo?.customerId,
            basket?.basketId,
            site
        )
        const response = await adyenPaypalUpdateOrderService.updatePaypalOrder(currentPaymentData)
        component.updatePaymentData(response?.paymentData)
    } catch (err) {
        return actions.reject(data.errors.ADDRESS_ERROR)
    }
}

/**
 * Handles shipping method selection changes during PayPal Express checkout.
 * Updates the selected shipping method in the basket and updates the PayPal order
 * with the new shipping cost and total amount.
 *
 * @param {object} data - Shipping options change event data
 * @param {object} data.shippingMethod - Selected shipping method from PayPal
 * @param {string} data.shippingMethod.id - Shipping method ID
 * @param {object} data.errors - Error types for rejection
 * @param {object} actions - Action handlers (resolve, reject)
 * @param {object} component - Adyen component instance with paymentData
 * @param {object} props - Component properties
 * @param {string} props.token - Authentication token
 * @param {object} props.basket - Shopping basket object
 * @param {object} props.site - Site configuration
 * @returns {Promise<void>}
 */
export const onShippingOptionsChange = async (data, actions, component, props) => {
    try {
        const {selectedShippingOption} = data
        const currentPaymentData = component.paymentData
        const basket = props.getBasket ? props.getBasket() : props.basket
        const {site, token} = props
        if (!selectedShippingOption) {
            return actions.reject(data.errors.METHOD_UNAVAILABLE)
        }
        const adyenShippingMethodsService = new AdyenShippingMethodsService(
            token,
            basket?.customerInfo?.customerId,
            basket?.basketId,
            site
        )
        await adyenShippingMethodsService.updateShippingMethod(selectedShippingOption.id)
        const adyenPaypalUpdateOrderService = new AdyenPaypalUpdateOrderService(
            token,
            basket?.customerInfo?.customerId,
            basket?.basketId,
            site
        )
        const response = await adyenPaypalUpdateOrderService.updatePaypalOrder(currentPaymentData)
        component.updatePaymentData(response?.paymentData)
    } catch (err) {
        return actions.reject(data.errors.METHOD_UNAVAILABLE)
    }
}

/**
 * Handles errors during PayPal Express checkout.
 * Cancels the express payment, cleans up the basket, removes shipping method and address,
 * and redirects to checkout page with error flag.
 *
 * @param {Error} error - The error that occurred
 * @param {object} component - Adyen component instance
 * @param {object} props - Component properties
 * @param {string} props.token - Authentication token
 * @param {object} props.basket - Shopping basket object
 * @param {string} props.customerId - Customer ID
 * @param {object} props.site - Site configuration
 * @param {Function} props.navigate - Navigation function
 * @returns {Promise<object>} Object indicating cancellation status
 */
export const onErrorHandler = async (error, component, props) => {
    try {
        const basket = props.getBasket ? props.getBasket() : props.basket
        const paymentCancelExpressService = new PaymentCancelExpressService(
            props.token,
            props.customerId,
            basket?.basketId,
            props.site
        )
        await paymentCancelExpressService.paymentCancelExpress()
        props.navigate(`/checkout?error=true`)
        return {cancelled: true}
    } catch (err) {
        console.error('Error during express payment cancellation:', err)
        return {cancelled: false, error: err.message}
    }
}
