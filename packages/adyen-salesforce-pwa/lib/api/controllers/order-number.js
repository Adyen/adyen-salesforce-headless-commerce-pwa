import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {CustomShopperOrderApiClient} from '../models/customShopperOrderApi.js'

/**
 * An Express middleware that generates a new unique order number and returns it to the client.
 * The storefront calls this before initiating a payment to get a fresh order number,
 * which is then stored on the basket as c_orderNo and used as the Adyen merchantReference.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function getOrderNumber(req, res, next) {
    try {
        Logger.info('getOrderNumber', 'start')
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        const existingOrderNo = adyenContext.basket?.c_orderNo
        if (existingOrderNo) {
            Logger.info('getOrderNumber', `Reusing existing order number: ${existingOrderNo}`)
            res.locals.response = {orderNo: existingOrderNo}
            return next()
        }

        const customOrderApi = new CustomShopperOrderApiClient(adyenContext.siteId)
        const orderNo = await customOrderApi.generateOrderNo(adyenContext.authorization)

        if (!orderNo) {
            throw new AdyenError('Failed to generate order number', 500)
        }

        await adyenContext.basketService.update({c_orderNo: orderNo})

        Logger.info('getOrderNumber', `Generated order number: ${orderNo}`)
        res.locals.response = {orderNo}
        return next()
    } catch (err) {
        Logger.error('getOrderNumber', err.stack)
        return next(err)
    }
}

export default getOrderNumber
