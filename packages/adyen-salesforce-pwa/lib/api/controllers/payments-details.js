import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {validateBasketPayments} from '../helpers/paymentsHelper.js'
import {createOrderUsingOrderNo} from '../helpers/orderHelper.js'
import {
    buildCheckoutResponse,
    patchOrderPaymentInstrument,
    handleReconciliationError
} from '../helpers/orderReconciliation.js'
import AdyenClientProvider from '../models/adyenClientProvider'
import {createIdempotencyKey} from '../utils/paymentUtils'

/**
 * An Express middleware that handles the /payments/details request from the client.
 * This is used for handling additional actions required by 3D Secure, redirects, etc.
 * If the details call fails, the order is failed and the basket is reopened.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function sendPaymentDetails(req, res, next) {
    let preCreatedOrderNo = null
    try {
        Logger.info('sendPaymentDetails', 'start')
        const {
            body: {data}
        } = req
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }
        const {basket, basketService} = adyenContext
        const hasBasket = !!basket?.basketId
        const isStandardRedirectReturn = !basket?.c_orderNo

        const amount = basket.c_amount ? JSON.parse(basket.c_amount) : ''
        const paymentMethod = basket.c_paymentMethod ? JSON.parse(basket.c_paymentMethod) : ''

        if (!hasBasket || isStandardRedirectReturn) {
            Logger.info(
                'sendPaymentDetails',
                `standard redirect return — order pre-created in payments step (hasBasket: ${hasBasket})`
            )
        } else {
            // Basket with c_orderNo — express/partial-payment flow: create order before details call
            Logger.info('sendPaymentDetails', 'validateBasketPayments')
            await validateBasketPayments(adyenContext, amount, paymentMethod)
            await basketService.addPaymentInstrument(amount, paymentMethod)
            await createOrderUsingOrderNo(adyenContext)
            preCreatedOrderNo = basket?.c_orderNo
            Logger.info('sendPaymentDetails', `created SFCC order: ${preCreatedOrderNo}`)
        }

        const checkout = new AdyenClientProvider(adyenContext).getPaymentsApi()
        const response = await checkout.paymentsDetails(data, {
            idempotencyKey: createIdempotencyKey(data)
        })
        Logger.info('sendPaymentDetails', `resultCode ${response.resultCode}`)

        const resolvedOrderNo = response?.merchantReference || preCreatedOrderNo

        if ((!hasBasket || isStandardRedirectReturn) && resolvedOrderNo) {
            preCreatedOrderNo = resolvedOrderNo
            Logger.info('sendPaymentDetails', `resolved pre-created order: ${preCreatedOrderNo}`)
        }

        const checkoutResponse = buildCheckoutResponse(
            response,
            resolvedOrderNo,
            ERROR_MESSAGE.PAYMENTS_DETAILS_NOT_SUCCESSFUL
        )

        if (
            !checkoutResponse.isFinal &&
            checkoutResponse.isSuccessful &&
            response?.order?.orderData
        ) {
            await basketService.update({
                c_orderData: JSON.stringify(response.order)
            })
        }

        if (checkoutResponse.isFinal && checkoutResponse.isSuccessful) {
            const pspReference = response?.pspReference || response?.order?.pspReference
            if (preCreatedOrderNo && pspReference) {
                await patchOrderPaymentInstrument(
                    {
                        orderNo: preCreatedOrderNo,
                        siteId: adyenContext.siteId,
                        pspReference,
                        donationToken: response.donationToken
                    },
                    'sendPaymentDetails'
                )
            }
            Logger.info('sendPaymentDetails', `order exists: ${checkoutResponse.merchantReference}`)
        }
        Logger.info('sendPaymentDetails', `checkoutResponse ${checkoutResponse?.resultCode}`)
        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        Logger.error('sendPaymentDetails', err.stack)
        const newBasketId = await handleReconciliationError(res, preCreatedOrderNo, {
            stepName: 'sendPaymentDetails',
            requireBasket: true
        })
        if (newBasketId) {
            err.newBasketId = newBasketId
        }
        return next(err)
    }
}

export default sendPaymentDetails
