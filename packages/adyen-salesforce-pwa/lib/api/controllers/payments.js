import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {
    createCheckoutResponse,
    createPaymentRequestObject,
    revertCheckoutState,
    validateBasketPayments,
    isApplePayExpress
} from '../helpers/paymentsHelper.js'
import {createOrderUsingOrderNo} from '../helpers/orderHelper.js'
import {createIdempotencyKey} from '../utils/paymentUtils'

/**
 * Handles errors that occur during the payment process.
 * It attempts to remove payment instruments, fail the SFCC order, and recreate the basket.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>}
 */
async function handlePaymentError(res) {
    try {
        Logger.info('handlePaymentError', 'start')
        await revertCheckoutState(res.locals.adyen, 'sendPayments')
    } catch (err) {
        Logger.error('handlePaymentError', err.stack)
    }
}

/**
 * An Express middleware that handles the /payments request from the client.
 * It orchestrates the payment process by creating a payment request,
 * calling the Adyen API, and handling the response.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function sendPayments(req, res, next) {
    try {
        Logger.info('sendPayments', 'start')
        const {
            body: {data}
        } = req
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        if (isApplePayExpress(data)) {
            await adyenContext.basketService.addShopperData(data)
        }
        const paymentRequest = await createPaymentRequestObject(data, adyenContext, req)
        Logger.info('sendPayments', 'validateBasketPayments')
        // Validate the basket and the payment amounts.
        await validateBasketPayments(
            adyenContext,
            paymentRequest.amount,
            paymentRequest.paymentMethod
        )
        const checkout = new AdyenClientProvider(adyenContext).getPaymentsApi()
        const response = await checkout.payments(paymentRequest, {
            idempotencyKey: createIdempotencyKey(paymentRequest)
        })
        Logger.info('sendPayments', `resultCode ${response?.resultCode}`)

        const checkoutResponse = {
            ...createCheckoutResponse(response, adyenContext.basket?.c_orderNo),
            order: response?.order,
            resultCode: response?.resultCode
        }

        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(ERROR_MESSAGE.PAYMENT_NOT_SUCCESSFUL, 400, response)
        }

        if (checkoutResponse.isSuccessful) {
            await adyenContext.basketService.update({
                c_amount: JSON.stringify(paymentRequest?.amount),
                c_paymentMethod: JSON.stringify(paymentRequest?.paymentMethod),
                c_pspReference: response?.pspReference
            })
        }

        if (
            !checkoutResponse.isFinal &&
            checkoutResponse.isSuccessful &&
            response?.order?.orderData
        ) {
            await adyenContext.basketService.update({
                c_orderData: JSON.stringify(response.order)
            })
            await adyenContext.basketService.addPaymentInstrument(
                paymentRequest?.amount,
                paymentRequest?.paymentMethod,
                response?.pspReference
            )
        }
        if (checkoutResponse.isFinal && checkoutResponse.isSuccessful) {
            await adyenContext.basketService.addPaymentInstrument(
                paymentRequest?.amount,
                paymentRequest?.paymentMethod,
                response?.pspReference
            )
            await createOrderUsingOrderNo(adyenContext)
            Logger.info('sendPayments', `order created: ${checkoutResponse.merchantReference}`)
        }
        Logger.info('sendPayments', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)

        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        Logger.error('sendPayments', err.stack)
        await handlePaymentError(res)
        return next(err)
    }
}

export default sendPayments
