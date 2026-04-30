import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getBasket, getCurrentBasketForAuthorizedShopper} from '../helpers/basketHelper.js'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'
import {BasketService} from '../models/basketService.js'
import {getCustomer} from '../helpers/customerHelper'

/**
 * Factory that creates a payments/details context middleware with the given plugin options.
 *
 * Always attempts to fetch the basket. If the basket is not found (consumed by order
 * creation in the payments step for standard/redirect flows), falls back to minimal
 * context — the controller detects this via `basket.basketId` being absent and handles
 * each flow accordingly.
 *
 * @param {object} [options={}] - Plugin-level options (e.g. `{ nativeThreeDS: 'disabled' }`).
 * @returns {Function} Express middleware function.
 */
export function createPaymentsDetailsContext(options = {}) {
    return async function preparePaymentsDetailsContext(req, res, next) {
        const route = req.originalUrl
        Logger.info(`prepareRequestContext for ${route}`, 'start')
        const {authorization, basketid, customerid} = req.headers
        const {siteId} = req.query

        const isValidValue = (value) => value && value !== 'undefined' && value !== 'null'

        if (!isValidValue(authorization) || !isValidValue(customerid) || !isValidValue(siteId)) {
            const missing = []
            if (!isValidValue(authorization)) missing.push('authorization header')
            if (!isValidValue(customerid)) missing.push('customerid header')
            if (!isValidValue(siteId)) missing.push('siteId query param')
            const errorMessage = `Missing required parameters: ${missing.join(', ')}`
            Logger.error(`prepareRequestContext for ${route}`, errorMessage)
            return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
        }

        try {
            const adyenConfig = getAdyenConfigForCurrentSite(siteId, options)

            let basket = null
            let customer = null

            if (isValidValue(basketid)) {
                try {
                    ;[basket, customer] = await Promise.all([
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
                } catch (err) {
                    Logger.info(
                        `prepareRequestContext for ${route}`,
                        `Basket not available (${err.message}) — using minimal context`
                    )
                }
            }
            const adyenContext = {
                basket: basket || {},
                adyenConfig,
                siteId,
                authorization,
                customerId: customerid,
                customer: customer || null
            }
            adyenContext.basketService = new BasketService(adyenContext, res)
            res.locals.adyen = adyenContext

            Logger.info(
                `prepareRequestContext for ${route}`,
                basket ? 'success with basket' : 'success with minimal context (no basket)'
            )
            return next()
        } catch (err) {
            Logger.error(`prepareRequestContext for ${route}`, err.stack)
            return next(err)
        }
    }
}

/**
 * Default payments details context middleware (no plugin options).
 * Provided for backward compatibility when `registerAdyenEndpoints` is called without options.
 */
export const preparePaymentsDetailsContext = createPaymentsDetailsContext()
