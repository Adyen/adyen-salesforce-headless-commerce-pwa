import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'

/**
 * A lightweight middleware that prepares a minimal request context for endpoints
 * that don't require basket or customer data. It validates the presence of the
 * `siteId` query parameter, fetches the Adyen configuration, and attaches it to
 * `res.locals.adyen`.
 *
 * Use this for webhooks, temporary basket creation, or any endpoint that only
 * needs Adyen configuration without basket/customer dependencies.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export async function prepareMinimalRequestContext(req, res, next) {
    Logger.info('prepareMinimalRequestContext', 'start')
    const {siteId} = req.query

    if (!siteId) {
        return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
    }

    try {
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        res.locals.adyen = {adyenConfig, siteId}
        Logger.info('prepareMinimalRequestContext', 'success')
        return next()
    } catch (err) {
        return next(err)
    }
}
