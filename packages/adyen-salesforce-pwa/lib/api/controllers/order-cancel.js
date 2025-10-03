import Logger from '../models/logger'
import {failOrderAndReopenBasket} from '../helpers/orderHelper.js'

/**
 * An Express middleware that handles the cancellation of an order.
 * It fails the order and reopens the corresponding basket.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object (not used).
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function orderCancel(req, res, next) {
    Logger.info('orderCancel', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        const {orderNo} = req.body
        await failOrderAndReopenBasket(adyenContext, orderNo)
        Logger.info('orderCancel', `Basket for order ${orderNo} reopened`)
        next()
    } catch (err) {
        Logger.error('orderCancel', err.stack)
        next(err)
    }
}

export default orderCancel
