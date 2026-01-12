import Logger from '../models/logger'
import {revertCheckoutStateForExpress} from '../helpers/paymentsHelper.js'

/**
 * An Express middleware that handles the cancellation of an express payment.
 * It cleans up the basket, removes shipping method and shipping address.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object (not used).
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function paymentCancelExpress(req, res, next) {
    Logger.info('paymentCancelExpress', 'start')
    try {
        const {adyen: adyenContext} = res.locals

        await revertCheckoutStateForExpress(adyenContext, 'paymentCancelExpress')
        res.locals.response = {}
        next()
    } catch (err) {
        Logger.error('paymentCancelExpress', err.stack)
        next(err)
    }
}

export default paymentCancelExpress
