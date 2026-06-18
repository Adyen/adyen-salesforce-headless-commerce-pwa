import {ERROR_MESSAGE, POS} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {TerminalRequestBuilder} from '../models/TerminalRequestBuilder'

/**
 * Express middleware that sends an abort request for an in-progress terminal payment.
 * Uses the Adyen Terminal Cloud API sync method to send an abort request.
 * Order failure and basket recovery are handled by the createTerminalPayment controller
 * when its sync call returns with ErrorCondition: Aborted.
 *
 * Requires minimalRequestContext middleware (provides adyenConfig via res.locals.adyen).
 * Request body: {serviceId, terminalId}
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function abortTerminalPayment(req, res, next) {
    try {
        Logger.info('abortTerminalPayment', 'start')
        const {adyen: adyenContext} = res.locals

        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        const {serviceId, terminalId} = req.body

        if (!terminalId) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        if (!serviceId) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        const abortRequest = TerminalRequestBuilder.createAbort(
            terminalId,
            POS.SALE_ID,
            POS.ABORT_REASON.MERCHANT_ABORT,
            serviceId
        )

        const terminalCloudApi = new AdyenClientProvider(adyenContext).getTerminalClient()
        let response
        try {
            response = await terminalCloudApi.sync(abortRequest)
            Logger.info('abortTerminalPayment', 'abort sent')
        } catch (syncErr) {
            Logger.error('abortTerminalPayment syncError', syncErr.message)
        }

        res.locals.response = {success: true, response}
        next()
    } catch (err) {
        Logger.error('abortTerminalPayment', err.message)
        next(err)
    }
}

export default abortTerminalPayment
