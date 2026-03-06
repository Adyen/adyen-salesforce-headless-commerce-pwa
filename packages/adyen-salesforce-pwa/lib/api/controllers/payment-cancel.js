import Logger from '../models/logger'
import {revertCheckoutState} from '../helpers/paymentsHelper.js'
import {failOrderAndReopenBasket, getOpenOrderForShopper} from '../helpers/orderHelper.js'

/**
 * An Express middleware that handles the cancellation of an order.
 * It fails the order and reopens the corresponding basket.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object (not used).
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function paymentCancel(req, res, next) {
    Logger.info('paymentCancel', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        const {authorization, customerId} = adyenContext
        let orderNo = req.body?.orderNo || adyenContext.basket?.c_orderNo

        if (!orderNo) {
            const openOrder = await getOpenOrderForShopper(authorization, customerId)
            orderNo = openOrder?.orderNo
        }

        if (orderNo) {
            Logger.info('paymentCancel', `failing order ${orderNo} and reopening basket`)
            const newBasketId = await failOrderAndReopenBasket(adyenContext, orderNo)
            res.locals.response = newBasketId ? {newBasketId} : {}
        } else {
            const basket = adyenContext.basket || {}
            const hasPaymentData =
                basket.c_paymentData || basket.c_pspReference || basket.c_orderData
            if (hasPaymentData) {
                await revertCheckoutState(adyenContext, 'paymentCancel')
                res.locals.response = {}
            } else {
                Logger.info('paymentCancel', 'no abandoned payment found — skipping')
                res.locals.response = {cancelled: false}
            }
        }
        next()
    } catch (err) {
        Logger.error('paymentCancel', err.stack)
        next(err)
    }
}

export default paymentCancel
