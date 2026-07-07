import Logger from '../models/logger.js'
import {AdyenError} from '../models/AdyenError.js'
import {createCheckoutResponse, revertCheckoutState} from './paymentsHelper.js'
import {failOrderAndReopenBasket, updateOrderPaymentInstrument} from './orderHelper.js'

/**
 * Builds the checkout response returned to the client from an Adyen /payments or
 * /payments/details response, and enforces the final-failure invariant shared by both
 * sendPayments and sendPaymentDetails: a final, unsuccessful result must abort the
 * request with an AdyenError rather than be returned as a 200 response.
 * @param {object} response - The response from the Adyen /payments or /payments/details call.
 * @param {string|null} orderNo - The order number to use as merchantReference fallback.
 * @param {string} notSuccessfulMessage - The ERROR_MESSAGE to use if the payment is final and unsuccessful.
 * @returns {object} The checkout response to assign to res.locals.response.
 * @throws {AdyenError} If the result is final and unsuccessful.
 */
export function buildCheckoutResponse(response, orderNo, notSuccessfulMessage) {
    const checkoutResponse = {
        ...createCheckoutResponse(response, orderNo),
        order: response?.order,
        resultCode: response?.resultCode
    }

    if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
        throw new AdyenError(notSuccessfulMessage, 400, response)
    }

    return checkoutResponse
}

/**
 * Patches the PSP reference (and related custom properties) onto a pre-created SFCC order.
 * This call is best-effort: failures are logged and swallowed rather than propagated, since by
 * this point the Adyen payment has already succeeded and the shopper-facing response must not
 * be blocked on an order-patching failure.
 * @param {object} params - The properties to patch onto the order's payment instrument.
 * @param {string} params.orderNo - The order number to patch.
 * @param {string} params.siteId - The site ID for the API client.
 * @param {string} params.pspReference - The Adyen PSP reference.
 * @param {string|number} [params.cardInstallments] - The selected number of installments, if any.
 * @param {string} [params.donationToken] - The Adyen donation token, if any.
 * @param {string} stepName - The name of the calling controller step, for logging purposes.
 * @returns {Promise<void>}
 */
export async function patchOrderPaymentInstrument(
    {orderNo, siteId, pspReference, cardInstallments, donationToken},
    stepName
) {
    try {
        await updateOrderPaymentInstrument(orderNo, siteId, pspReference, {
            pspReference,
            cardInstallments,
            donationToken
        })
    } catch (piErr) {
        Logger.error(
            stepName,
            `Failed to update payment instrument on order ${orderNo}: ${piErr.message}`
        )
    }
}

/**
 * Unified error handler for the /payments and /payments/details controllers. If an order was
 * pre-created before the Adyen call, fails it and reopens the basket. Otherwise reverts the
 * basket's Adyen-related state, unless requireBasket is set and no basket is present (used by
 * sendPaymentDetails for the standard-redirect-return flow, where the originating basket has
 * already been consumed into an order).
 * @param {object} res - The Express response object.
 * @param {string|null} orderNo - The order number if an order was pre-created before the Adyen call.
 * @param {object} options
 * @param {string} options.stepName - The name of the calling controller step, for logging purposes.
 * @param {boolean} [options.requireBasket] - If true, only revert checkout state when a basket is present.
 * @returns {Promise<string|null>} The new basket ID if the order was failed and basket reopened.
 */
export async function handleReconciliationError(res, orderNo, {stepName, requireBasket = false}) {
    try {
        Logger.info(stepName, 'handling reconciliation error')
        const adyenContext = res.locals.adyen
        if (orderNo) {
            return await failOrderAndReopenBasket(adyenContext, orderNo)
        }
        const hasBasket = !!adyenContext?.basket?.basketId
        if (!requireBasket || hasBasket) {
            await revertCheckoutState(adyenContext, stepName)
        }
    } catch (err) {
        Logger.error(stepName, err.stack)
    }
    return null
}
