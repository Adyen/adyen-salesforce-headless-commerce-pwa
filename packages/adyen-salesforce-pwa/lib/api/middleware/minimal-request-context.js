import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'

/**
 * Factory that creates a minimal request context middleware with the given plugin options.
 * The middleware prepares a minimal request context for endpoints that don't require
 * basket or customer data. It validates the presence of the `siteId` query parameter,
 * fetches the Adyen configuration, and attaches it to `res.locals.adyen`.
 *
 * Use this for webhooks, temporary basket creation, or any endpoint that only
 * needs Adyen configuration without basket/customer dependencies.
 *
 * @param {object} [options={}] - Plugin-level options (e.g. `{ nativeThreeDS: 'disabled' }`).
 * @returns {Function} Express middleware function.
 */
export function createMinimalRequestContext(options = {}) {
    return async function prepareMinimalRequestContext(req, res, next) {
        Logger.info('prepareMinimalRequestContext', 'start')
        const {siteId} = req.query
        const {authorization, customerid} = req.headers

        if (!siteId) {
            return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
        }

        try {
            const adyenConfig = getAdyenConfigForCurrentSite(siteId, options)
            res.locals.adyen = {
                adyenConfig,
                siteId,
                ...(authorization && {authorization}),
                ...(customerid && {customerId: customerid})
            }
            Logger.info('prepareMinimalRequestContext', 'success')
            return next()
        } catch (err) {
            return next(err)
        }
    }
}

/**
 * Default minimal request context middleware (no plugin options).
 * Provided for backward compatibility when `registerAdyenEndpoints` is called without options.
 */
export const prepareMinimalRequestContext = createMinimalRequestContext()
