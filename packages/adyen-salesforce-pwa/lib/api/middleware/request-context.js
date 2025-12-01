import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getBasket} from '../helpers/basketHelper.js'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'
import {BasketService} from '../models/basketService.js'
import {getCustomer} from '../helpers/customerHelper'

/**
 * A middleware that extracts, validates, and prepares a request context.
 * It validates the presence of essential headers and query parameters,
 * fetches the basket and Adyen configuration, and attaches them to `res.locals.adyen`.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export async function prepareRequestContext(req, res, next) {
    const route = req.originalUrl
    Logger.info(`prepareRequestContext for ${route}`, 'start')
    const {authorization, basketid, customerid} = req.headers
    const {siteId} = req.query

    if (!authorization || !basketid || !customerid || !siteId) {
        const missing = []
        if (!authorization) missing.push('authorization header')
        if (!basketid) missing.push('basketid header')
        if (!customerid) missing.push('customerid header')
        if (!siteId) missing.push('siteId query param')

        const errorMessage = `Missing required parameters: ${missing.join(', ')}`
        Logger.error(`prepareRequestContext for ${route}`, errorMessage)
        return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
    }

    try {
        const basket = await getBasket(authorization, basketid, customerid)
        const customer = await getCustomer(authorization, customerid)
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)

        const adyenContext = {
            basket,
            adyenConfig,
            siteId,
            authorization,
            customerId: customerid,
            customer
        }

        // Instantiate and attach the basket service to the context
        adyenContext.basketService = new BasketService(adyenContext, res)
        res.locals.adyen = adyenContext

        Logger.info(`prepareRequestContext for ${route}`, 'success')
        return next()
    } catch (err) {
        Logger.error(`prepareRequestContext for ${route}`, err.stack)
        return next(err)
    }
}
