import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'

/**
 * Factory that creates an Apple Pay context middleware with the given plugin options.
 * The middleware prepares a minimal request context for Apple Pay endpoints that don't
 * require basket or customer data. It reads the optional `siteId` query parameter,
 * fetches the Adyen configuration, and attaches it to `res.locals.adyen`.
 *
 * Unlike `createMinimalRequestContext`, this middleware does NOT require `siteId` to be present,
 * allowing Apple's crawler to request the well-known domain association file without query params.
 * When `siteId` is absent, `getAdyenConfigForCurrentSite` falls back to the global env config.
 *
 * @param {object} [options={}] - Plugin-level options (e.g. `{ nativeThreeDS: 'disabled' }`).
 * @returns {Function} Express middleware function.
 */
export function createApplePayContext(options = {}) {
    return async function prepareApplePayContext(req, res, next) {
        Logger.info('prepareApplePayContext', 'start')
        const {siteId} = req.query
        const {authorization, customerid} = req.headers

        try {
            const adyenConfig = getAdyenConfigForCurrentSite(siteId, options)
            res.locals.adyen = {
                adyenConfig,
                ...(siteId && {siteId}),
                ...(authorization && {authorization}),
                ...(customerid && {customerId: customerid})
            }
            Logger.info('prepareApplePayContext', 'success')
            return next()
        } catch (err) {
            return next(err)
        }
    }
}

/**
 * Default Apple Pay context middleware (no plugin options).
 * Provided for backward compatibility when `registerAdyenEndpoints` is called without options.
 */
export const prepareApplePayContext = createApplePayContext()
