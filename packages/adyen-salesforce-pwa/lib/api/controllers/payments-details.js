import Logger from '../models/logger'
import {v4 as uuidv4} from 'uuid'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {createCheckoutResponse, revertCheckoutState} from '../helpers/paymentsHelper.js'
import {createOrderUsingOrderNo} from "../helpers/orderHelper.js";
import AdyenClientProvider from "../models/adyenClientProvider";

/**
 * Handles errors that occur during the payment details submission process.
 * It attempts to remove payment instruments, fail the SFCC order, and recreate the basket.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>}
 */
async function handlePaymentDetailsError(res) {
    try {
        Logger.info('handlePaymentDetailsError', 'start')
        await revertCheckoutState(res.locals.adyen, 'sendPaymentDetails')
    } catch (err) {
        Logger.error('handlePaymentDetailsError', err.stack)
    }
}

/**
 * An Express middleware that handles the /payments/details request from the client.
 * This is used for handling additional actions required by 3D Secure, vouchers, etc.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function sendPaymentDetails(req, res, next) {
    try {
        Logger.info('sendPaymentDetails', 'start')
        const {body: {data}} = req
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)

        }
        const {basket, siteId} = adyenContext
        const checkout = new AdyenClientProvider(adyenContext).getPaymentsApi()
        const response = await checkout.paymentsDetails(data, {
            idempotencyKey: uuidv4()
        })
        Logger.info('sendPaymentDetails', `resultCode ${response.resultCode}`)
        const checkoutResponse = {
            ...createCheckoutResponse(response, adyenContext.basket?.c_orderNo),
            order: response?.order,
            resultCode: response?.resultCode,
        }
        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(ERROR_MESSAGE.PAYMENTS_DETAILS_NOT_SUCCESSFUL, 400, response)
        }

        if (!checkoutResponse.isFinal && checkoutResponse.isSuccessful && response.order) {
            await adyenContext.basketService.update({
                c_orderData: JSON.stringify(response.order)
            })
        }
        if (checkoutResponse.isFinal && checkoutResponse.isSuccessful) {
            // The payment is now fully authorized, so we can create the final order.
            await createOrderUsingOrderNo(adyenContext)
            Logger.info('sendPaymentDetails', `order created: ${checkoutResponse.merchantReference}`)
        }
        Logger.info('sendPaymentDetails', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)
        res.locals.response = checkoutResponse
        next()
    } catch (err) {
        Logger.error('sendPaymentDetails', err.stack)
        await handlePaymentDetailsError(res)
        return next(err)
    }
}

export default sendPaymentDetails
