import AdyenClientProvider from '../models/adyenClientProvider.js'
import Logger from '../models/logger.js'
import {ERROR_MESSAGE, PAYMENT_METHOD_TYPES, RESULT_CODES} from '../../utils/constants.mjs'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {AdyenError} from '../models/AdyenError.js'
import {PaymentRequestBuilder} from '../models/PaymentRequestBuilder.js'
import {createIdempotencyKey} from '../utils/paymentUtils'

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
        c_amount: '',
        c_pspReference: '',
        c_paymentData: '',
        c_paymentDataForReviewPage: '',
        c_orderNo: ''
    })
    await adyenContext.basketService.removeAllPaymentInstruments()
}

/**
 * Clears only the gift-card-specific basket attributes and payment instruments after
 * a partial payment order is cancelled.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @private
 */
async function _cleanupGiftCardOrder(adyenContext) {
    await adyenContext.basketService.update({
        c_orderData: '',
        c_giftCardCheckBalance: ''
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
        idempotencyKey: createIdempotencyKey(request)
    })

    if (response.resultCode === 'Received') {
        Logger.info('cancelAdyenOrder', 'Resetting basket state')
        await _cleanupGiftCardOrder(adyenContext)
    }

    Logger.info('cancelAdyenOrder', 'success')
    return response
}

// Utility functions moved to ../utils/paymentUtils.js to avoid circular dependencies

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
 * equals the basket's expected total amount.
 * PayPal express is built from the net product amount (no tax, no shipping), so its request
 * amount is taken as the expected total and the comparison is skipped. Every other payment,
 * including Apple Pay and Google Pay express, is validated against the basket order total.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {object} [amount] - The Adyen payment request amount with value and currency.
 * @param {object} [paymentMethod] - The Adyen payment request paymentMethod.
 * @throws {AdyenError} If the amounts do not match or currency mismatch detected.
 */
export async function validateBasketPayments(adyenContext, amount, paymentMethod) {
    const {basket = {}} = adyenContext
    const adyenOrderData = JSON.parse(basket.c_orderData || '{}')
    const isPartialPayment = !!adyenOrderData?.orderData
    const remainingAmountValue = adyenOrderData?.remainingAmount?.value ?? 0
    const isGiftCardPayment = paymentMethod?.type === PAYMENT_METHOD_TYPES.GIFT_CARD
    const isPayPalExpressPayment = isPayPalExpress({paymentMethod})

    // Validate currency match
    if (amount?.currency && amount.currency !== basket.currency) {
        throw new AdyenError('Currency mismatch between payment and basket', 409)
    }

    const expectedBasketTotal = isPayPalExpressPayment
        ? amount?.value
        : getCurrencyValueForApi(basket.orderTotal, basket.currency)

    if (isPartialPayment) {
        // Validate that adyenOrderData has required structure
        if (!adyenOrderData?.amount?.value) {
            throw new AdyenError('Invalid order data structure', 500)
        }

        const adyenOrderAmount = adyenOrderData.amount.value
        const basketTotalInMinorUnits = getCurrencyValueForApi(basket.orderTotal, basket.currency)

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

    // PayPal express is submitted with the net product amount, so it can only be validated
    // once tax and shipping have been calculated on the basket.
    if (isPayPalExpressPayment) {
        return
    }

    if (isPartialPayment && isGiftCardPayment) {
        // For partial gift card payments, validate against remaining amount
        if (amount?.value > remainingAmountValue) {
            throw new AdyenError(ERROR_MESSAGE.AMOUNTS_DONT_MATCH, 409)
        }
        // Ensure total payments don't exceed basket total
        if (finalAmount > expectedBasketTotal) {
            throw new AdyenError(ERROR_MESSAGE.AMOUNTS_DONT_MATCH, 409)
        }
    } else if (finalAmount !== expectedBasketTotal) {
        // For a single, final payment, the amount must match the basket total exactly.
        throw new AdyenError(ERROR_MESSAGE.AMOUNTS_DONT_MATCH, 409)
    }
}

/**
 * Handles cleanup after an order is failed and a new basket is reopened.
 * Unlike revertCheckoutState, this always performs a full basket cleanup regardless
 * of partial payment state. If a partial payment (gift card) order exists, it cancels
 * it with Adyen first, then cleans the basket.
 * @param {object} adyenContext - The request context pointing at the reopened basket.
 * @param {string} stepName - The name of the caller for logging purposes.
 */
export async function cleanupReopenedBasket(adyenContext, stepName) {
    if (!adyenContext) {
        const errorMessage = `${ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND} in ${stepName}`
        throw new AdyenError(errorMessage, 500)
    }
    const {basket = {}} = adyenContext
    const adyenOrderData = JSON.parse(basket?.c_orderData || '{}')
    const isPartialPayment = !!adyenOrderData?.orderData
    if (isPartialPayment) {
        await cancelAdyenOrder(adyenContext, adyenOrderData)
    }
    await _cleanupBasket(adyenContext)
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
    const adyenOrderData = JSON.parse(basket?.c_orderData || '{}')
    const isPartialPayment = !!adyenOrderData?.orderData
    if (isPartialPayment) {
        await cancelAdyenOrder(adyenContext, adyenOrderData)
        return
    }

    await _cleanupBasket(adyenContext)
}

/**
 * Handles the cleanup process for a failed express payment.
 * It resets the basket's Adyen-related custom attributes, removes all payment instruments,
 * removes shipping method and shipping address from the basket.
 * Does nothing when no basket is resolved, so a fallback basket created after the real one was
 * consumed into an order is left untouched.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {string} stepName - The name of the controller step for logging purposes (e.g., 'paymentCancelExpress').
 */
export async function revertCheckoutStateForExpress(adyenContext, stepName) {
    if (!adyenContext) {
        const errorMessage = `${ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND} in ${stepName}`
        throw new AdyenError(errorMessage, 500)
    }

    if (!adyenContext.basket?.basketId) {
        Logger.info(stepName, 'revertCheckoutStateForExpress skipped — no basket to revert')
        return
    }

    await _cleanupBasket(adyenContext)
    await adyenContext.basketService.removeShippingAddress()
}

// filterStateData and getNativeThreeDS moved to ../utils/paymentUtils.js to avoid circular dependencies

/**
 * Constructs the complete payment request object to be sent to the Adyen /payments endpoint.
 * @param {object} data - The payment state data from the client.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {object} req - The Express request object.
 * @returns {Promise<object>} A promise that resolves to the Adyen payment request object.
 */
export async function createPaymentRequestObject(data, adyenContext, req) {
    Logger.info('createPaymentRequestObject', 'start')
    if (isPayPalExpress(data)) {
        Logger.info('createPaymentRequestObject', 'paypal express')
        const {basket, adyenConfig} = adyenContext
        return new PaymentRequestBuilder({basket, stateData: data, adyenConfig, req})
            .withStateData()
            .withBillingAddress()
            .withDeliveryAddress()
            .withReference()
            .withMerchantAccount()
            .withNetProductAmount()
            .withApplicationInfo()
            .withChannel('Web')
            .withReturnUrl()
            .withShopperReference()
            .withShopperIP()
            .withAdditionalData()
            .withShopperLocale()
            .build()
    }

    const builder = PaymentRequestBuilder.createDefault(data, adyenContext, req)

    if (builder.isPartialPaymentRequest()) {
        Logger.info('createPaymentRequestObject', 'partial payment')
    }

    const paymentRequest = builder.build()

    return paymentRequest
}

/**
 * Check if the payment method is Apple Pay Express.
 * @param {object} data - The payment state data from the client.
 * @returns {boolean} True if the payment method is Apple Pay Express, false otherwise.
 */
export function isApplePayExpress(data) {
    return data.paymentMethod?.type === 'applepay' && data.paymentMethod?.subtype === 'express'
}

/**
 * Check if the payment method is Google Pay Express.
 * @param {object} data - The payment state data from the client.
 * @returns {boolean} True if the payment method is Google Pay Express, false otherwise.
 */
export function isGooglePayExpress(data) {
    return data.paymentMethod?.type === 'googlepay' && data.paymentMethod?.subtype === 'express'
}

/**
 * Check if the payment method is PayPal Express.
 * @param {object} data - The payment state data from the client.
 * @returns {boolean} True if the payment method is PayPal Express, false otherwise.
 */
export function isPayPalExpress(data) {
    return data.paymentMethod?.type === 'paypal' && data.paymentMethod?.subtype === 'express'
}

/**
 * Returns true when the SFCC order must be created before calling Adyen /payments, so an
 * AUTHORISATION webhook can never arrive before the order exists.
 * Gift cards are excluded because a partial payment order is only finalised once the remaining
 * amount is covered. PayPal express is excluded because its request carries the net product
 * amount, so the basket total is not final yet and a pre-created order would not match the
 * authorised amount.
 * @param {object} data - The payment state data from the client.
 * @returns {boolean}
 */
export function shouldCreateOrderBeforePayment(data) {
    if (data?.paymentMethod?.type === PAYMENT_METHOD_TYPES.GIFT_CARD) {
        return false
    }
    if (data?.paymentMethod?.subtype !== 'express') {
        return true
    }
    return isApplePayExpress(data) || isGooglePayExpress(data)
}
