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
    updatePaymentInstrumentForOrder
} from '../helpers/orderHelper.js'
import AdyenClientProvider from '../models/adyenClientProvider'
import {createIdempotencyKey} from '../utils/paymentUtils'

/**
 * Handles errors that occur during the payment details submission process.
 * If an order was pre-created before the paymentsDetails call, fails it and reopens the basket.
 * Otherwise reverts basket state.
 * @param {object} res - The Express response object.
 * @param {string|null} orderNo - The order number if an order was pre-created.
 * @returns {Promise<string|null>} The new basket ID if the order was failed and basket reopened.
 */
async function handlePaymentDetailsError(res, orderNo) {
    try {
        Logger.info('handlePaymentDetailsError', 'start')
        const adyenContext = res.locals.adyen
        if (orderNo) {
            return await failOrderAndReopenBasket(adyenContext, orderNo)
        }
        const hasBasket = !!adyenContext?.basket?.basketId
        if (hasBasket) {
            await revertCheckoutState(adyenContext, 'sendPaymentDetails')
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
                await updatePaymentInstrumentForOrder(
                    adyenContext,
                    preCreatedOrderNo,
                    pspReference,
                    response.donationToken
                )
            }
            Logger.info('sendPaymentDetails', `order exists: ${checkoutResponse.merchantReference}`)
        }
        Logger.info('sendPaymentDetails', `checkoutResponse ${checkoutResponse?.resultCode}`)
        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        Logger.error('sendPaymentDetails', err.stack)
        const newBasketId = await handlePaymentDetailsError(res, preCreatedOrderNo)
        if (newBasketId) {
            err.newBasketId = newBasketId
        }
        return next(err)
    }
}

export default sendPaymentDetails
