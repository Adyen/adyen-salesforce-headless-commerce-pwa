import {v4 as uuidv4} from 'uuid'
import AdyenClientProvider from '../models/adyenClientProvider.js'
import Logger from '../models/logger.js'
import {
    ERROR_MESSAGE,
    PAYMENT_METHOD_TYPES,
    RECURRING_PROCESSING_MODEL,
    RESULT_CODES,
    SHOPPER_INTERACTIONS
} from '../../utils/constants.mjs'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {AdyenError} from '../models/AdyenError.js'
import {formatAddressInAdyenFormat} from '../../utils/formatAddress.mjs'
import {getApplicationInfo} from '../../utils/getApplicationInfo.mjs'

const OPEN_INVOICE_METHODS = new Set(['zip', 'affirm', 'clearpay'])
const OPEN_INVOICE_PREFIXES = ['afterpay', 'klarna', 'ratepay', 'facilypay']
const ZERO_TAX_METHODS = ['klarna']
const GROSS_TAXATION = 'gross'

function shouldExcludeTaxRate(paymentMethodType) {
    return paymentMethodType && ZERO_TAX_METHODS.some((pm) => paymentMethodType.includes(pm))
}

/**
 * A private helper to reset the basket's Adyen-related custom attributes
 * and remove all associated payment instruments.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @private
 */
async function _cleanupBasket(adyenContext) {
    await adyenContext.basketService.update({
        c_orderData: '',
        c_giftCardCheckBalance: '',
        c_paymentMethod: '',
        c_amount: ''
    })
    await adyenContext.basketService.removeAllPaymentInstruments()
}

/**
 * Cancels an existing Adyen partial payment order and resets the basket state.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {object} order - The Adyen order object to be canceled.
 * @returns {Promise<object>} The response from the Adyen cancel order API.
 */
export async function cancelAdyenOrder(adyenContext, order) {
    Logger.info('cancelAdyenOrder', 'start')
    const {adyenConfig} = adyenContext
    const ordersApi = new AdyenClientProvider(adyenContext).getOrdersApi()

    const request = {
        order,
        merchantAccount: adyenConfig.merchantAccount
    }
    const response = await ordersApi.cancelOrder(request, {
        idempotencyKey: uuidv4()
    })

    if (response.resultCode === 'Received') {
        Logger.info('cancelAdyenOrder', 'Resetting basket state')
        await _cleanupBasket(adyenContext)
    }

    Logger.info('cancelAdyenOrder', 'success')
    return response
}

/**
 * Calculates the amount for a partial payment.
 * If the payment method is a gift card, it returns the minimum of the remaining amount and the card's balance.
 * Otherwise, it returns the remaining amount.
 * @param {object} data - The payment state data from the client.
 * @param {object} basket - The shopper's basket object.
 * @returns {number} The amount to be paid.
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
 * @returns {{firstName: string, lastName: string}} An object containing the shopper's name.
 */
export function getShopperName(basket) {
    const {firstName, lastName} = basket.billingAddress
    return {
        firstName,
        lastName
    }
}

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
    basket?.productItems?.forEach((product, index) => {
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
 * @param {string} taxation - The taxation type (net/gross).
 * @param {boolean} excludeTaxRate - Whether to exclude the tax rate in the line item.
 * @param {number} [quantity=item.quantity] - The quantity of the item.
 * @returns {object} The item formatted as an Adyen line item.
 * @private
 */
const mapToLineItem = (item, currency, taxation, excludeTaxRate, quantity = item.quantity) => ({
    id: item.itemId || item.priceAdjustmentId,
    quantity,
    description: item.itemText,
    amountExcludingTax: getCurrencyValueForApi(
        taxation === GROSS_TAXATION ? item.basePrice - item.tax : item.basePrice,
        currency
    ),
    taxAmount: getCurrencyValueForApi(item.tax, currency),
    taxPercentage: excludeTaxRate ? 0 : item.taxRate
})

/**
 * Transforms all items in the basket (products, shipping, promotions) into an array of Adyen line items.
 * @param {object} basket - The shopper's basket object.
 * @param {string} paymentMethodType - The type of the payment method (e.g., 'klarna', 'afterpay').
 * @returns {object[]} An array of Adyen line items.
 */
export function getLineItems(basket, paymentMethodType) {
    const {currency, productItems, shippingItems, priceAdjustments, taxation} = basket
    const excludeTaxRate = shouldExcludeTaxRate(paymentMethodType)
    const mapItemWithContext = (item, quantity) =>
        mapToLineItem(item, currency, taxation, excludeTaxRate, quantity)

    const productLineItems = productItems?.map((item) => mapItemWithContext(item)) || []
    const shippingLineItems = shippingItems?.map((item) => mapItemWithContext(item, 1)) || []
    const priceAdjustmentLineItems = priceAdjustments?.map((item) => mapItemWithContext(item)) || []

    return [...productLineItems, ...shippingLineItems, ...priceAdjustmentLineItems]
}

const ACTION_CODES = new Set([
    RESULT_CODES.REDIRECT_SHOPPER,
    RESULT_CODES.IDENTIFY_SHOPPER,
    RESULT_CODES.CHALLENGE_SHOPPER,
    RESULT_CODES.PENDING,
    RESULT_CODES.PRESENT_TO_SHOPPER
])

const SUCCESSFUL_CODES = new Set([RESULT_CODES.AUTHORISED, RESULT_CODES.RECEIVED])
const FAILURE_CODES = new Set([RESULT_CODES.REFUSED, RESULT_CODES.ERROR, RESULT_CODES.CANCELLED])

export function createCheckoutResponse(response, orderNumber) {
    const {resultCode, action, order} = response
    const merchantReference = response.merchantReference || orderNumber
    if (FAILURE_CODES.has(resultCode)) {
        return {
            isFinal: true,
            isSuccessful: false,
            merchantReference,
            refusalReason: response.refusalReason
        }
    }
    if (ACTION_CODES.has(resultCode)) {
        return {
            isFinal: false,
            isSuccessful: true,
            action,
            merchantReference
        }
    }
    const isFinal = order ? order.remainingAmount.value <= 0 : true
    return {
        isFinal,
        isSuccessful: SUCCESSFUL_CODES.has(resultCode),
        merchantReference
    }
}

/**
 * Validates that the sum of all payment instruments and the current payment request amount
 * equals the basket's total order amount.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {object} [amount] - The Adyen payment request amount.
 * @param {object} [paymentMethod] - The Adyen payment request paymentMethod.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @throws {AdyenError} If the amounts do not match.
 */
export async function validateBasketPayments(adyenContext, amount, paymentMethod) {
    const {basket = {}} = adyenContext
    const adyenOrderData = JSON.parse(basket.c_orderData || '{}')
    const isPartialPayment = !!adyenOrderData?.orderData
    const remainingAmountValue = adyenOrderData?.remainingAmount?.value ?? 0
    const isGiftCardPayment = paymentMethod?.type === PAYMENT_METHOD_TYPES.GIFT_CARD
    const basketTotalInMinorUnits = getCurrencyValueForApi(basket.orderTotal, basket.currency)

    if (isPartialPayment) {
        const adyenOrderAmount = adyenOrderData.amount.value
        // If basket total has changed, cancel the Adyen order and throw to restart the flow.
        if (adyenOrderAmount !== basketTotalInMinorUnits) {
            // The controller will catch this and call revertCheckoutState
            throw new AdyenError(ERROR_MESSAGE.BASKET_CHANGED, 409, {basketChanged: true})
        }
    }

    // Sum of amounts for payment instruments already in the basket.
    // Note: paymentInstrument.amount is in major units (e.g., 25.00)
    const existingInstrumentsTotal =
        basket.paymentInstruments?.reduce((total, pi) => total + pi.amount, 0) ?? 0
    const existingInstrumentsTotalInMinorUnits = getCurrencyValueForApi(
        existingInstrumentsTotal,
        basket.currency
    )

    const finalAmount = existingInstrumentsTotalInMinorUnits + (amount?.value ?? 0)

    if (isPartialPayment && isGiftCardPayment && remainingAmountValue !== amount?.value) {
        // For partial payments, the sum of payments should not exceed the basket total.
        if (finalAmount > basketTotalInMinorUnits) {
            throw new AdyenError(ERROR_MESSAGE.AMOUNTS_DONT_MATCH, 409)
        }
    } else if (finalAmount !== basketTotalInMinorUnits) {
        // For a single, final payment, the amount must match the basket total exactly.
        throw new AdyenError(ERROR_MESSAGE.AMOUNTS_DONT_MATCH, 409)
    }
}

/**
 * Handles the cleanup process for a failed payment.
 * It resets the basket's Adyen-related custom attributes, removes all payment instruments,
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {string} stepName - The name of the controller step for logging purposes (e.g., 'sendPayments').
 */
export async function revertCheckoutState(adyenContext, stepName) {
    if (!adyenContext) {
        const errorMessage = `${ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND} in ${stepName}`
        throw new AdyenError(errorMessage, 500)
    }
    const {basket = {}} = adyenContext
    const adyenOrderData = JSON.parse(basket.c_orderData || '{}')
    const isPartialPayment = !!adyenOrderData?.orderData
    if (isPartialPayment) {
        await cancelAdyenOrder(adyenContext, adyenOrderData)
        return
    }

    await _cleanupBasket(adyenContext)
}

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

/**
 * Constructs the complete payment request object to be sent to the Adyen /payments endpoint.
 * @param {object} data - The payment state data from the client.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {object} req - The Express request object.
 * @returns {Promise<object>} A promise that resolves to the Adyen payment request object.
 */
export async function createPaymentRequestObject(data, adyenContext, req) {
    const {basket, adyenConfig} = adyenContext
    Logger.info('createPaymentRequestObject', 'start')
    let amountValue = getCurrencyValueForApi(basket.orderTotal, basket.currency)
    if (data?.order?.orderData) {
        Logger.info('createPaymentRequestObject', 'partial payment')
        amountValue = amountForPartialPayments(data, basket)
    }
    const paymentRequest = {
        ...filterStateData(data),
        billingAddress: data.billingAddress || formatAddressInAdyenFormat(basket.billingAddress),
        deliveryAddress:
            data.deliveryAddress || formatAddressInAdyenFormat(basket.shipments[0].shippingAddress),
        reference: basket.c_orderNo,
        merchantAccount: adyenConfig.merchantAccount,
        amount: {
            value: amountValue,
            currency: basket.currency
        },
        applicationInfo: getApplicationInfo(adyenConfig.systemIntegratorName),
        authenticationData: {
            threeDSRequestData: {
                nativeThreeDS: getNativeThreeDS(adyenConfig)
            }
        },
        channel: 'Web',
        returnUrl: data.returnUrl || `${data.origin}/checkout/redirect`,
        shopperReference: basket?.customerInfo?.customerId,
        shopperEmail: basket?.customerInfo?.email,
        shopperName: getShopperName(basket),
        shopperIP: req.ip
    }

    if (isOpenInvoiceMethod(data?.paymentMethod?.type)) {
        paymentRequest.lineItems = getLineItems(basket, data.paymentMethod.type)
        paymentRequest.countryCode = paymentRequest.billingAddress.country
    }

    // Add recurringProcessingModel in case shopper wants to save the card from checkout
    if (data.storePaymentMethod) {
        paymentRequest.recurringProcessingModel = RECURRING_PROCESSING_MODEL.CARD_ON_FILE
    }

    if (data.paymentMethod?.storedPaymentMethodId) {
        paymentRequest.recurringProcessingModel = RECURRING_PROCESSING_MODEL.CARD_ON_FILE
        paymentRequest.shopperInteraction = SHOPPER_INTERACTIONS.CONT_AUTH
    } else {
        paymentRequest.shopperInteraction = SHOPPER_INTERACTIONS.ECOMMERCE
    }

    // The order object should only be included if it contains valid orderData.
    if (paymentRequest.order && !paymentRequest.order.orderData) {
        delete paymentRequest.order
    }

    paymentRequest.additionalData = getAdditionalData(basket)

    return paymentRequest
}
