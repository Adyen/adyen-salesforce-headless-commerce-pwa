import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {BasketService} from '../models/basketService.js'

/**
 * Creates a temporary basket for the current shopper.
 * Expects the following request metadata:
 * - headers.authorization: Shopper auth token (required)
 * - headers.customerid: Shopper customer id (required)
 * - query.siteId: Current site id (required)
 */
export default async function CreateTemporaryBasketController(req, res, next) {
    try {
        Logger.info('CreateTemporaryBasketController', 'start')
        const {authorization, customerid} = req.headers
        const {siteId} = req.query

        if (!authorization || !customerid || !siteId) {
            const missing = []
            if (!authorization) missing.push('authorization header')
            if (!customerid) missing.push('customerid header')
            if (!siteId) missing.push('siteId query param')
            Logger.error(
                'CreateTemporaryBasketController',
                `Missing required parameters: ${missing.join(', ')}`
            )
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        const adyenContext = {
            adyenConfig,
            siteId,
            authorization,
            customerId: customerid
        }

        adyenContext.basketService = new BasketService(adyenContext, res)
        const basket = await adyenContext.basketService.createTemporaryBasket()

        adyenContext.basket = basket
        res.locals.adyen = adyenContext

        res.locals.response = {
            temporaryBasketCreated: Boolean(basket?.basketId),
            amount: basket?.orderTotal
        }

        Logger.info('CreateTemporaryBasketController', 'success')
        return next()
    } catch (err) {
        Logger.error('CreateTemporaryBasketController', err.stack)
        return next(err)
    }
}
