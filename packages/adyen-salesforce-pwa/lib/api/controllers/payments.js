import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {v4 as uuidv4} from 'uuid'
import {AdyenError} from '../models/AdyenError'
import {
    createCheckoutResponse,
    createPaymentRequestObject,
    revertCheckoutState,
    validateBasketPayments
} from '../helpers/paymentsHelper.js'
import {createOrderUsingOrderNo} from "../helpers/orderHelper.js";


/**
 * Handles errors that occur during the payment process.
 * It attempts to remove payment instruments, fail the SFCC order, and recreate the basket.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>}
 */
async function handlePaymentError(res) {
    try {
        Logger.info('handlePaymentError', 'start')
        await revertCheckoutState(res.locals.adyen, 'sendPayments')
    } catch (err) {
        Logger.error('handlePaymentError', err.stack)
    }
}

/**
 * An Express middleware that handles the /payments request from the client.
 * It orchestrates the payment process by creating a payment request,
 * calling the Adyen API, and handling the response.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function sendPayments(req, res, next) {
    try {
        Logger.info('sendPayments', 'start')
        const {body: {data}} = req
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)

        }
        const checkout = new AdyenClientProvider(adyenContext).getPaymentsApi()

        if (data.paymentType === 'express') {
            await adyenContext.basketService.addShopperData(data)
        }
        const paymentRequest = await createPaymentRequestObject(data, adyenContext, req)

        Logger.info('sendPayments', 'validateBasketPayments')
        // Pass the entire `res.locals.adyen` context for a cleaner signature
        await validateBasketPayments(paymentRequest, adyenContext)

        const response = await checkout.payments(paymentRequest, {
            idempotencyKey: uuidv4()
        })
        Logger.info('sendPayments', `resultCode ${response?.resultCode}`)

        const checkoutResponse = {
            ...createCheckoutResponse(response, adyenContext.basket?.c_orderNo),
            order: response?.order,
            resultCode: response?.resultCode,
        }

        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(ERROR_MESSAGE.PAYMENT_NOT_SUCCESSFUL, 400, response)
        }

        // Add payment instrument if the payment was successful (even if not final, e.g., partial payment or action required)
        if (checkoutResponse.isSuccessful) {
            await adyenContext.basketService.addPaymentInstrument(response, paymentRequest)
        }

        if (!checkoutResponse.isFinal && checkoutResponse.isSuccessful && response.order) {
            await adyenContext.basketService.update({
                c_orderData: JSON.stringify(response.order)
            })
        }
        if (checkoutResponse.isFinal && checkoutResponse.isSuccessful) {
            await createOrderUsingOrderNo(adyenContext)
            Logger.info('sendPayments', `order created: ${checkoutResponse.merchantReference}`)
        }
        Logger.info('sendPayments', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)

        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        Logger.error('sendPayments', err.stack)
        await handlePaymentError(res)
        return next(err)
    }
}

export default sendPayments
