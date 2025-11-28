import {baseConfig, onSubmit, onAdditionalDetails} from '../helpers/baseConfig'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {AdyenShopperDetailsService} from '../../services/shopper-details'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenPaypalUpdateOrderService} from '../../services/paypal-update-order'
import {formatPayPalShopperDetails} from '../helpers/addressHelper'

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
        configuration = {}
    } = props

    return {
        ...baseConfig(props),
        showPayButton: true,
        isExpress: true,
        onSubmit: executeCallbacks(
            [...beforeSubmit, onSubmit, ...afterSubmit, onPaymentsSuccess],
            props
        ),
        onAdditionalDetails: executeCallbacks(
            [
                ...beforeAdditionalDetails,
                onAdditionalDetails,
                ...afterAdditionalDetails,
                onPaymentsDetailsSuccess
            ],
            props
        ),
        onAuthorized: executeCallbacks(
            [...beforeAuthorized, onAuthorized, ...afterAuthorized, onAuthorizedSuccess],
            props
        ),
        onShippingAddressChange: executeCallbacks(
            [
                ...beforeShippingAddressChange,
                onShippingAddressChange,
                ...afterShippingAddressChange
            ],
            props
        ),
        onShippingOptionsChange: executeCallbacks(
            [
                ...beforeShippingOptionsChange,
                onShippingOptionsChange,
                ...afterShippingOptionsChange
            ],
            props
        ),
        ...configuration
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
        const {basket, site, token} = props
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
        const {basket, site, token, fetchShippingMethods} = props
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
        const {defaultShippingMethodId, applicableShippingMethods} = await fetchShippingMethods()
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
        const {basket, site, token} = props
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
