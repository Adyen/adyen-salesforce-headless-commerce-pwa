import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger.js'

/**
 * A middleware that prepares a request context specifically for Adyen webhooks.
 * It validates the presence of the `siteId` query parameter, fetches the Adyen
 * configuration, and attaches it to `res.locals.adyen`.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export async function prepareWebhookRequestContext(req, res, next) {
    Logger.info('prepareWebhookRequestContext', 'start')
    const {siteId} = req.query

    if (!siteId) {
        return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
    }

    try {
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        res.locals.adyen = {adyenConfig, siteId}
        Logger.info('prepareWebhookRequestContext', 'success')
        return next()
    } catch (err) {
        return next(err)
    }
}