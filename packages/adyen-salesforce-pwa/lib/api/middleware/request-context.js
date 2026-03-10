import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getBasket, getCurrentBasketForAuthorizedShopper} from '../helpers/basketHelper.js'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'
import {BasketService} from '../models/basketService.js'
import {getCustomer} from '../helpers/customerHelper'

/**
 * Factory that creates a request context middleware with the given plugin options.
 * The middleware extracts, validates, and prepares a request context.
 * It validates the presence of essential headers and query parameters,
 * fetches the basket and Adyen configuration, and attaches them to `res.locals.adyen`.
 *
 * @param {object} [options={}] - Plugin-level options (e.g. `{ nativeThreeDS: 'disabled' }`).
 * @returns {Function} Express middleware function.
 */
export function createRequestContext(options = {}) {
    return async function prepareRequestContext(req, res, next) {
        const route = req.originalUrl
        Logger.info(`prepareRequestContext for ${route}`, 'start')
        const {authorization, basketid, customerid} = req.headers
        const {siteId} = req.query

        const isValidValue = (value) => {
            return value && value !== 'undefined' && value !== 'null'
        }

        if (
            !isValidValue(authorization) ||
            !isValidValue(basketid) ||
            !isValidValue(customerid) ||
            !isValidValue(siteId)
        ) {
            const missing = []
            if (!isValidValue(authorization)) missing.push('authorization header')
            if (!isValidValue(basketid)) missing.push('basketid header')
            if (!isValidValue(customerid)) missing.push('customerid header')
            if (!isValidValue(siteId)) missing.push('siteId query param')

            const errorMessage = `Missing required parameters: ${missing.join(', ')}`
            Logger.error(`prepareRequestContext for ${route}`, errorMessage)
            return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
        }

        try {
            const [basketResult, customer] = await Promise.all([
                getBasket(authorization, basketid.trim(), customerid.trim(), siteId).catch(
                    (err) => {
                        if (err?.statusCode === 404) {
                            Logger.info(
                                `prepareRequestContext for ${route}`,
                                `Basket ${basketid} not found, falling back to current basket`
                            )
                            return getCurrentBasketForAuthorizedShopper(
                                authorization,
                                customerid.trim(),
                                siteId
                            )
                        }
                        throw err
                    }
                ),
                getCustomer(authorization, customerid.trim(), siteId)
            ])
            const basket = basketResult
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
}

/**
 * Default request context middleware (no plugin options).
 * Provided for backward compatibility when `registerAdyenEndpoints` is called without options.
 */
export const prepareRequestContext = createRequestContext()
