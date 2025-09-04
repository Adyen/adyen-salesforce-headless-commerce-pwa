import {createCheckoutResponse} from '../../utils/createCheckoutResponse.mjs'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {v4 as uuidv4} from 'uuid'
import {AdyenError} from '../models/AdyenError'
import {getBasket, removeAllPaymentInstrumentsFromBasket, saveToBasket} from "../../utils/basketHelper.mjs";
import {ERROR_MESSAGE} from "../../utils/constants.mjs";
import {createOrderUsingOrderNo, failOrderAndReopenBasket} from "../../utils/orderHelper.mjs";

/**
 * Handles errors that occur during the payment details submission process.
 * It attempts to remove payment instruments, fail the SFCC order, and recreate the basket.
 * @param {Error} err - The error that occurred.
 * @param {object} req - The Express request object.
 * @returns {Promise<void>}
 */
async function handlePaymentDetailsError(err, req) {
    Logger.error('sendPaymentDetails', err.stack)
    try {
        const {authorization, basketid, customerid} = req.headers
        const basket = await getBasket(authorization, basketid, customerid)
        if (basket?.paymentInstruments?.length) {
            Logger.info('removeAllPaymentInstrumentsFromBasket')
            await removeAllPaymentInstrumentsFromBasket(authorization, basket)
        }
        const order = await createOrderUsingOrderNo(authorization, customerid, basketid, basket.c_orderNo)

        if (order?.orderNo) {
            Logger.info('updateOrderStatus and recreate basket')
            await failOrderAndReopenBasket(authorization, customerid, order.orderNo)
        }
    } catch (e) {
        Logger.error('sendPaymentDetails - failed to handle paymentDetails error', e.stack)
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
    Logger.info('sendPaymentDetails', 'start')
    try {
        const {body: {data}, headers: {authorization, basketid, customerid}, query: {siteId}} = req

        const basket = await getBasket(authorization, basketid, customerid)

        const checkout = AdyenCheckoutConfig.getInstance(siteId)
        const response = await checkout.paymentsDetails(data, {
            idempotencyKey: uuidv4()
        })
        Logger.info('sendPaymentDetails', `resultCode ${response.resultCode}`)
        const checkoutResponse = {
            ...createCheckoutResponse(response, basket?.c_orderNo),
            order: response.order
        }
        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(ERROR_MESSAGE.PAYMENTS_DETAILS_NOT_SUCCESSFUL, 400, response)
        }

        if (!checkoutResponse.isFinal && checkoutResponse.isSuccessful && response.order) {
            await saveToBasket(authorization, basket.basketId, {
                c_orderData: JSON.stringify(response.order)
            })
        }
        if (checkoutResponse.isFinal && checkoutResponse.isSuccessful) {
            await createOrderUsingOrderNo(authorization, customerid, basketid, basket.c_orderNo)
        }
        Logger.info('sendPaymentDetails', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)
        res.locals.response = checkoutResponse
        next()
    } catch (err) {
        await handlePaymentDetailsError(err, req)
        return next(err)
    }
}

export default sendPaymentDetails
