import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'
import {getCustomer} from '../helpers/customerHelper'
import {createShopperOrderClient} from '../helpers/orderHelper'

/**
 * A middleware that prepares a request context for order-based endpoints
 * (e.g. donations). It validates the presence of the authorization token,
 * customer ID, order number, and site ID. It fetches the order using the
 * shopper's token (ensuring ownership) and attaches the context to
 * `res.locals.adyen`.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export async function prepareOrderRequestContext(req, res, next) {
    const route = req.originalUrl
    Logger.info(`prepareOrderRequestContext for ${route}`, 'start')
    const {authorization, customerid, orderno} = req.headers
    const {siteId} = req.query

    const isValidValue = (value) => {
        return value && value !== 'undefined' && value !== 'null'
    }

    if (
        !isValidValue(authorization) ||
        !isValidValue(customerid) ||
        !isValidValue(orderno) ||
        !isValidValue(siteId)
    ) {
        const missing = []
        if (!isValidValue(authorization)) missing.push('authorization header')
        if (!isValidValue(customerid)) missing.push('customerid header')
        if (!isValidValue(orderno)) missing.push('orderno header')
        if (!isValidValue(siteId)) missing.push('siteId query param')

        const errorMessage = `Missing required parameters: ${missing.join(', ')}`
        Logger.error(`prepareOrderRequestContext for ${route}`, errorMessage)
        return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
    }

    try {
        const shopperOrders = createShopperOrderClient(authorization, siteId)
        const [shopperOrder, customer] = await Promise.all([
            shopperOrders.getOrder({
                parameters: {orderNo: orderno.trim()}
            }),
            getCustomer(authorization, customerid.trim())
        ])

        if (!shopperOrder?.orderNo) {
            throw new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 404)
        }

        if (shopperOrder?.customerInfo?.customerId !== customerid.trim()) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_ORDER, 404)
        }

        const adyenConfig = getAdyenConfigForCurrentSite(siteId)

        res.locals.adyen = {
            order: shopperOrder,
            adyenConfig,
            siteId,
            authorization,
            customerId: customerid,
            customer
        }

        Logger.info(`prepareOrderRequestContext for ${route}`, 'success')
        return next()
    } catch (err) {
        Logger.error(`prepareOrderRequestContext for ${route}`, err.stack)
        return next(err)
    }
}
