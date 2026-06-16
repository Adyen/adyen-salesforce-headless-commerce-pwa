import {ERROR_MESSAGE, POS} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {generateServiceId, buildMessageHeader} from '../helpers/terminalHelper'
import {failOrderAndReopenBasket} from '../helpers/orderHelper.js'

/**
 * Express middleware that sends an abort request for an in-progress terminal payment.
 * Uses the Adyen Terminal Cloud API sync method to send an abort request.
 * Fails the order (from orderRequestContext) and reopens the basket.
 *
 * Requires orderRequestContext middleware (provides order via res.locals.adyen.order).
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
        const orderNo = adyenContext.order?.orderNo

        if (!terminalId) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        if (!serviceId) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        const newServiceId = generateServiceId()

        const abortRequest = {
            SaleToPOIRequest: {
                MessageHeader: buildMessageHeader({
                    messageCategory: POS.MESSAGE_CATEGORY.ABORT,
                    serviceId: newServiceId,
                    terminalId
                }),
                AbortRequest: {
                    AbortReason: POS.ABORT_REASON.MERCHANT_ABORT,
                    MessageReference: {
                        SaleID: POS.SALE_ID,
                        ServiceID: serviceId,
                        MessageCategory: POS.MESSAGE_CATEGORY.PAYMENT
                    }
                }
            }
        }

        const terminalCloudApi = new AdyenClientProvider(adyenContext).getTerminalClient()
        let response
        try {
            response = await terminalCloudApi.sync(abortRequest)
            Logger.info('abortTerminalPayment', 'abort sent')
        } catch (syncErr) {
            Logger.error('abortTerminalPayment syncError', syncErr.message)
        }

        let newBasketId = null
        try {
            newBasketId = await failOrderAndReopenBasket(adyenContext, orderNo)
            Logger.info(
                'abortTerminalPayment',
                `order ${orderNo} failed, new basket: ${newBasketId}`
            )
        } catch (orderErr) {
            Logger.error('abortTerminalPayment orderFailure', orderErr.message)
        }

        res.locals.response = {success: true, response, newBasketId}
        next()
    } catch (err) {
        Logger.error('abortTerminalPayment', err.message)
        next(err)
    }
}

export default abortTerminalPayment
