import {PAYMENT_METHOD_TYPES} from '../../utils/constants.mjs'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'

/**
 * Calculates the amount for partial payments based on the order data and basket.
 * @param {object} data - The payment state data containing order information.
 * @param {object} basket - The shopper's basket object.
 * @returns {number} The amount value for partial payments in minor units.
 */
export function amountForPartialPayments(data, basket) {
    const remainingAmountValue = JSON.parse(basket.c_orderData || '{}')?.remainingAmount?.value ?? 0
    if (data.paymentMethod.type === PAYMENT_METHOD_TYPES.GIFT_CARD) {
        const balanceValue = JSON.parse(basket.c_giftCardCheckBalance || '{}')?.balance?.value ?? 0
        return Math.min(remainingAmountValue, balanceValue)
    }
    return remainingAmountValue
}

/**
 * Extracts the shopper's first and last name from the basket's billing address.
 * @param {object} basket - The shopper's basket object.
 * @returns {{firstName: string, lastName: string}|undefined} An object containing the shopper's name, or undefined if either name is missing.
 */
export function getShopperName(basket) {
    if (!basket?.billingAddress) {
        return undefined
    }
    const {firstName, lastName} = basket.billingAddress
    if (!firstName || !lastName) {
        return undefined
    }
    return {
        firstName,
        lastName
    }
}

const OPEN_INVOICE_METHODS = new Set(['zip', 'affirm', 'clearpay'])
const OPEN_INVOICE_PREFIXES = ['afterpay', 'klarna', 'ratepay', 'facilypay']

/**
 * Checks if a given payment method type is an open invoice method.
 * @param {string} paymentMethodType - The type of the payment method (e.g., 'klarna', 'afterpay').
 * @returns {boolean} True if the payment method is an open invoice type.
 */
export function isOpenInvoiceMethod(paymentMethodType) {
    if (!paymentMethodType) {
        return false
    }
    if (OPEN_INVOICE_METHODS.has(paymentMethodType)) {
        return true
    }
    return OPEN_INVOICE_PREFIXES.some((prefix) => paymentMethodType.includes(prefix))
}

/**
 * Creates an object with additional risk data based on the items in the basket.
 * @param {object} basket - The shopper's basket object.
 * @returns {object} An object containing additional data for risk assessment.
 */
export function getAdditionalData(basket) {
    const additionalData = {}
    basket.productItems.forEach((product, index) => {
        additionalData[`riskdata.basket.item${index + 1}.itemID`] = product.itemId
        additionalData[`riskdata.basket.item${index + 1}.productTitle`] = product.productName
        additionalData[`riskdata.basket.item${index + 1}.amountPerItem`] = getCurrencyValueForApi(
            product.basePrice,
            basket.currency
        )
        additionalData[`riskdata.basket.item${index + 1}.quantity`] = product.quantity
        additionalData[`riskdata.basket.item${index + 1}.currency`] = basket.currency
    })
    return additionalData
}

/**
 * Maps a basket item (product, shipping, or promotion) to the Adyen line item format.
 * @param {object} item - The basket item.
 * @param {string} currency - The currency code.
 * @param {number} [quantity=item.quantity] - The quantity of the item.
 * @returns {object} The item formatted as an Adyen line item.
 * @private
 */
const mapToLineItem = (item, currency, quantity = item.quantity) => ({
    id: item.itemId || item.priceAdjustmentId,
    quantity,
    description: item.itemText,
    amountExcludingTax: getCurrencyValueForApi(item.basePrice, currency),
    taxAmount: getCurrencyValueForApi(item.tax, currency),
    taxPercentage: item.taxRate
})

/**
 * Transforms all items in the basket (products, shipping, promotions) into an array of Adyen line items.
 * @param {object} basket - The shopper's basket object.
 * @returns {object[]} An array of Adyen line items.
 */
export function getLineItems(basket) {
    const {currency, productItems, shippingItems, priceAdjustments} = basket

    const productLineItems = productItems?.map((item) => mapToLineItem(item, currency)) || []
    const shippingLineItems = shippingItems?.map((item) => mapToLineItem(item, currency, 1)) || []
    const priceAdjustmentLineItems =
        priceAdjustments?.map((item) => mapToLineItem(item, currency)) || []

    return [...productLineItems, ...shippingLineItems, ...priceAdjustmentLineItems]
}

/**
 * Maps a basket item to Adyen line item format without tax amounts.
 * Used for PayPal Express where tax cannot be calculated during payments call.
 * @param {object} item - The basket item.
 * @param {string} currency - The currency code.
 * @param {number} [quantity=item.quantity] - The quantity of the item.
 * @returns {object} The item formatted as an Adyen line item without tax.
 * @private
 */
const mapToLineItemWithoutTax = (item, currency, quantity = item.quantity) => ({
    id: item.itemId || item.priceAdjustmentId,
    quantity,
    description: item.itemText,
    amountExcludingTax: getCurrencyValueForApi(item.basePrice, currency)
})

/**
 * Transforms all items in the basket into an array of Adyen line items without tax amounts.
 * Used specifically for PayPal Express where tax cannot be calculated during the payments call.
 * @param {object} basket - The shopper's basket object.
 * @returns {object[]} An array of Adyen line items without tax information.
 */
export function getLineItemsWithoutTax(basket) {
    const {currency, productItems, shippingItems, priceAdjustments} = basket

    const productLineItems =
        productItems?.map((item) => mapToLineItemWithoutTax(item, currency)) || []
    const shippingLineItems =
        shippingItems?.map((item) => mapToLineItemWithoutTax(item, currency, 1)) || []
    const priceAdjustmentLineItems =
        priceAdjustments?.map((item) => mapToLineItemWithoutTax(item, currency)) || []

    return [...productLineItems, ...shippingLineItems, ...priceAdjustmentLineItems]
}

/**
 * Valid state data fields that can be included in the payment request.
 */
const VALID_STATE_DATA_FIELDS = new Set([
    'paymentMethod',
    'billingAddress',
    'deliveryAddress',
    'riskData',
    'shopperName',
    'dateOfBirth',
    'telephoneNumber',
    'shopperEmail',
    'countryCode',
    'socialSecurityNumber',
    'browserInfo',
    'installments',
    'storePaymentMethod',
    'conversionId',
    'origin',
    'returnUrl',
    'order'
])

/**
 * Filters the state data object to include only a predefined set of valid fields.
 * @param {object} stateData - The raw state data from the client.
 * @returns {object} An object containing only the valid state data fields.
 */
export const filterStateData = (stateData) =>
    Object.entries(stateData).reduce((acc, [key, value]) => {
        if (VALID_STATE_DATA_FIELDS.has(key)) {
            acc[key] = value
        }
        return acc
    }, {})

/**
 * Determines the Native 3DS (3D Secure) setting based on the provided Adyen configuration.
 * If the configuration contains a valid Native 3DS value, it returns that value; otherwise,
 * it defaults to 'preferred'.
 *
 * @param {Object} adyenConfig - The Adyen configuration object
 * @param {string} [adyenConfig.nativeThreeDS] - The Native 3DS setting from Adyen configuration
 * @returns {'preferred'|'disabled'} Returns 'preferred' or 'disabled' based on the configuration
 */
export function getNativeThreeDS(adyenConfig) {
    const nativeThreeDSValues = ['preferred', 'disabled']
    return nativeThreeDSValues.includes(adyenConfig.nativeThreeDS)
        ? adyenConfig.nativeThreeDS
        : 'preferred'
}
