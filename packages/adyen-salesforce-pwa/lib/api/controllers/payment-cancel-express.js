import Logger from '../models/logger'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {AdyenError} from '../models/AdyenError'
import {revertCheckoutStateForExpress} from '../helpers/paymentsHelper.js'
import {failOrderAndReopenBasket} from '../helpers/orderHelper.js'

/**
 * An Express middleware that handles the cancellation of an express payment.
 * When an SFCC order was already created for the express payment, the order is failed and the
 * basket reopened. Otherwise it just cleans up the basket, removing shipping method and address.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function paymentCancelExpress(req, res, next) {
    Logger.info('paymentCancelExpress', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }
        const orderNo = req.body?.orderNo || adyenContext.basket?.c_orderNo
        const isTemporaryBasket = req.body?.isTemporaryBasket === true

        if (orderNo) {
            try {
                const newBasketId = await failOrderAndReopenBasket(adyenContext, orderNo, {
                    reopenBasket: !isTemporaryBasket,
                    removeShippingAddress: true
                })
                res.locals.response = {newBasketId}
                return next()
            } catch (err) {
                // The shopper commonly dismisses the payment sheet before an order exists;
                // fall back to reverting the basket in that case only.
                if (err.message !== ERROR_MESSAGE.ORDER_NOT_FOUND) {
                    throw err
                }
                Logger.info(
                    'paymentCancelExpress',
                    `no order ${orderNo} to fail — reverting basket state`
                )
            }
        }

        await revertCheckoutStateForExpress(adyenContext, 'paymentCancelExpress')
        res.locals.response = {}
        next()
    } catch (err) {
        Logger.error('paymentCancelExpress', err.stack)
        next(err)
    }
}

export default paymentCancelExpress
