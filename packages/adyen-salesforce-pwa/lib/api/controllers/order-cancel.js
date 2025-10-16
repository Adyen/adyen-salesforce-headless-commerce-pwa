import Logger from './logger'
import {failOrderAndReopenBasket} from '../../utils/orderHelper.mjs'

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
        const {body: {orderNo}, headers: {authorization, customerid}} = req
        await failOrderAndReopenBasket(authorization, customerid, orderNo)
        Logger.info('orderCancel', `basket reopened`);
        next()
    } catch (err) {
        Logger.error('orderCancel', JSON.stringify(err))
        next(err)
    }
}

export default orderCancel
