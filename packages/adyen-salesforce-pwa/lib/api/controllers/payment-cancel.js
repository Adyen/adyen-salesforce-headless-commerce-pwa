import Logger from '../models/logger'
import {revertCheckoutState} from '../helpers/paymentsHelper.js'

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
        const {orderNo} = req.body
        await revertCheckoutState(adyenContext, 'paymentCancel')
        res.locals.response = {}
        next()
    } catch (err) {
        Logger.error('paymentCancel', err.stack)
        next(err)
    }
}

export default paymentCancel
