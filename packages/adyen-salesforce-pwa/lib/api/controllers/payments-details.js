import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {
    createCheckoutResponse,
    revertCheckoutState,
    validateBasketPayments
} from '../helpers/paymentsHelper.js'
import {
    createOrderUsingOrderNo,
    failOrderAndReopenBasket,
    getOpenOrderForShopper,
    updateOrderPaymentInstrument
} from '../helpers/orderHelper.js'
import AdyenClientProvider from '../models/adyenClientProvider'
import {createIdempotencyKey} from '../utils/paymentUtils'

/**
 * Handles errors that occur during the payment details submission process.
 * If an order was already created, fails it and reopens the basket. Otherwise reverts basket state,
 * falling back to the shopper's open order when the basket was already consumed.
 * @param {object} res - The Express response object.
 * @param {string|null} orderNo - The order number if an order already exists for this payment.
 * @param {object} [options] - Failure handling options.
 * @param {boolean} [options.isTemporaryBasket=false] - True when the order was created from a
 * temporary (PDP express) basket, in which case the shopper's real cart must not be reopened.
 * @param {boolean} [options.removeShippingAddress=false] - True for express flows, where the
 * shipping address must be cleared so the express button re-mounts on a clean basket.
 * @returns {Promise<string|null>} The new basket ID if the order was failed and basket reopened.
 */
async function handlePaymentDetailsError(res, orderNo, options = {}) {
    const {isTemporaryBasket = false, removeShippingAddress = false} = options
    try {
        Logger.info('handlePaymentDetailsError', 'start')
        const adyenContext = res.locals.adyen
        if (!adyenContext) {
            return null
        }
        let resolvedOrderNo = orderNo

        if (!resolvedOrderNo) {
            const hasBasket = !!adyenContext?.basket?.basketId
            if (hasBasket) {
                await revertCheckoutState(adyenContext, 'sendPaymentDetails')
                return null
            }
            const openOrder = await getOpenOrderForShopper(
                adyenContext.authorization,
                adyenContext.customerId,
                adyenContext.siteId
            )
            resolvedOrderNo = openOrder?.orderNo
        }

        if (resolvedOrderNo) {
            return await failOrderAndReopenBasket(adyenContext, resolvedOrderNo, {
                reopenBasket: !isTemporaryBasket,
                removeShippingAddress
            })
        }
    } catch (err) {
        Logger.error('handlePaymentDetailsError', err.stack)
    }
    return null
}

/**
 * An Express middleware that handles the /payments/details request from the client.
 * This is used for handling additional actions required by 3D Secure, redirects, etc.
 * If the details call fails, the order is failed and the basket is reopened.
 * Express flows send `orderNo` because the order was already created in the /payments step; the
 * order is still verified against the shopper before it can be failed.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function sendPaymentDetails(req, res, next) {
    const {data, orderNo: clientOrderNo, isTemporaryBasket = false} = req.body || {}
    let preCreatedOrderNo = null
    try {
        Logger.info('sendPaymentDetails', 'start')
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }
        const {basket, basketService} = adyenContext
        const hasBasket = !!basket?.basketId
        const isStandardRedirectReturn = !basket?.c_orderNo

        const amount = basket.c_amount ? JSON.parse(basket.c_amount) : ''
        const paymentMethod = basket.c_paymentMethod ? JSON.parse(basket.c_paymentMethod) : ''

        if (clientOrderNo) {
            preCreatedOrderNo = clientOrderNo
            Logger.info(
                'sendPaymentDetails',
                `order already created in payments step: ${preCreatedOrderNo}`
            )
        } else if (!hasBasket || isStandardRedirectReturn) {
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

        if (!clientOrderNo && (!hasBasket || isStandardRedirectReturn) && resolvedOrderNo) {
            preCreatedOrderNo = resolvedOrderNo
            Logger.info('sendPaymentDetails', `resolved pre-created order: ${preCreatedOrderNo}`)
        }

        const checkoutResponse = {
            ...createCheckoutResponse(response, resolvedOrderNo),
            order: response?.order,
            resultCode: response?.resultCode
        }
        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(ERROR_MESSAGE.PAYMENTS_DETAILS_NOT_SUCCESSFUL, 400, response)
        }

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
                try {
                    await updateOrderPaymentInstrument(
                        preCreatedOrderNo,
                        adyenContext.siteId,
                        pspReference,
                        {
                            pspReference,
                            donationToken: response.donationToken
                        }
                    )
                } catch (piErr) {
                    Logger.error(
                        'sendPaymentDetails',
                        `Failed to update payment instrument on order ${preCreatedOrderNo}: ${piErr.message}`
                    )
                }
            }
            Logger.info('sendPaymentDetails', `order exists: ${checkoutResponse.merchantReference}`)
        }
        Logger.info('sendPaymentDetails', `checkoutResponse ${checkoutResponse?.resultCode}`)
        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        Logger.error('sendPaymentDetails', err.stack)
        const newBasketId = await handlePaymentDetailsError(
            res,
            preCreatedOrderNo || clientOrderNo,
            {isTemporaryBasket, removeShippingAddress: !!clientOrderNo}
        )
        if (newBasketId) {
            err.newBasketId = newBasketId
        }
        return next(err)
    }
}

export default sendPaymentDetails
