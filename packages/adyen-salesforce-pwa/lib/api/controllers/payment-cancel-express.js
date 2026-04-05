import Logger from '../models/logger'
import {revertCheckoutStateForExpress} from '../helpers/paymentsHelper.js'
import {deleteTemporaryBasket} from '../helpers/basketHelper.js'

/**
 * An Express middleware that handles the cancellation of an express payment.
 * It cleans up the basket, removes shipping method and shipping address.
 * Optionally deletes the temporary basket if requested.
 *
 * @param {object} req - The Express request object.
 * @param {object} req.body - The request body.
 * @param {boolean} [req.body.deleteTempBasket] - Optional flag to delete temporary basket.
 * @param {object} res - The Express response object (not used).
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function paymentCancelExpress(req, res, next) {
    Logger.info('paymentCancelExpress', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        const {deleteTempBasket = false} = req.body || {}

        if (deleteTempBasket) {
            await deleteTemporaryBasket(adyenContext.authorization, adyenContext.basket)
        } else {
            await revertCheckoutStateForExpress(adyenContext, 'paymentCancelExpress')
        }

        res.locals.response = {}
        next()
    } catch (err) {
        Logger.error('paymentCancelExpress', err.stack)
        next(err)
    }
}

export default paymentCancelExpress
