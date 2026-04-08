import {ERROR_MESSAGE, PAYMENT_METHOD_TYPES} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {
    createCheckoutResponse,
    createPaymentRequestObject,
    revertCheckoutState,
    validateBasketPayments,
    isApplePayExpress,
    isGooglePayExpress
} from '../helpers/paymentsHelper.js'
import {
    createOrderUsingOrderNo,
    failOrderAndReopenBasket,
    updatePaymentInstrumentForOrder
} from '../helpers/orderHelper.js'
import {createIdempotencyKey} from '../utils/paymentUtils'

/**
 * Returns true if the payment is a standard (non-express, non-gift-card) payment
 * for which the SFCC order should be created before calling Adyen /payments.
 * @param {object} data - The payment state data from the client.
 * @returns {boolean}
 */
function isStandardPayment(data) {
    const isExpress = data?.paymentMethod?.subtype === 'express'
    const isGiftCard = data?.paymentMethod?.type === PAYMENT_METHOD_TYPES.GIFT_CARD
    return !isExpress && !isGiftCard
}

/**
 * Handles errors that occur during the payment process.
 * For standard payments where an order was already created, fails the order and reopens the basket.
 * For other flows, reverts basket state.
 * @param {object} res - The Express response object.
 * @param {string|null} orderNo - The order number if an order was created before the payment call.
 * @returns {Promise<string|null>} The new basket ID if the order was failed and basket reopened.
 */
async function handlePaymentError(res, orderNo) {
    try {
        Logger.info('handlePaymentError', 'start')
        const adyenContext = res.locals.adyen
        if (orderNo) {
            return await failOrderAndReopenBasket(adyenContext, orderNo)
        }
        await revertCheckoutState(adyenContext, 'sendPayments')
    } catch (err) {
        Logger.error('handlePaymentError', err.stack)
    }
    return null
}

/**
 * An Express middleware that handles the /payments request from the client.
 * It orchestrates the payment process by creating a payment request,
 * calling the Adyen API, and handling the response.
 * For standard (non-express, non-gift-card) payments, the SFCC order is created
 * BEFORE calling Adyen /payments to prevent orphan payments. If the payment fails,
 * the order is failed and the basket is reopened.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function sendPayments(req, res, next) {
    let preCreatedOrderNo = null
    try {
        Logger.info('sendPayments', 'start')
        const {
            body: {data}
        } = req
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        if (isApplePayExpress(data) || isGooglePayExpress(data)) {
            await adyenContext.basketService.addShopperData(data)
        }
        const paymentRequest = await createPaymentRequestObject(data, adyenContext, req)
        Logger.info('sendPayments', 'validateBasketPayments')
        await validateBasketPayments(
            adyenContext,
            paymentRequest.amount,
            paymentRequest.paymentMethod
        )

        if (isStandardPayment(data)) {
            await adyenContext.basketService.addPaymentInstrument(
                paymentRequest?.amount,
                paymentRequest?.paymentMethod,
                [{field: 'c_cardInstallments', value: paymentRequest?.installments?.value}]
            )
            await createOrderUsingOrderNo(adyenContext)
            preCreatedOrderNo = adyenContext.basket?.c_orderNo
            Logger.info('sendPayments', `pre-created SFCC order: ${preCreatedOrderNo}`)
        }

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

        if (checkoutResponse.isSuccessful && !preCreatedOrderNo) {
            const basketUpdate = {
                c_amount: JSON.stringify(paymentRequest?.amount),
                c_paymentMethod: JSON.stringify(paymentRequest?.paymentMethod)
            }

            if (response?.pspReference) {
                basketUpdate.c_pspReference = response.pspReference
            }

            if (checkoutResponse.action) {
                basketUpdate.c_paymentData = JSON.stringify({
                    merchantReference: checkoutResponse.merchantReference,
                    resultCode: response?.resultCode,
                    timestamp: new Date().toISOString()
                })
            }

            await adyenContext.basketService.update(basketUpdate)
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
                [
                    {field: 'c_pspReference', value: response?.pspReference},
                    {field: 'c_cardInstallments', value: paymentRequest?.installments?.value}
                ]
            )
        }

        if (checkoutResponse.isFinal && checkoutResponse.isSuccessful) {
            if (!preCreatedOrderNo) {
                await adyenContext.basketService.addPaymentInstrument(
                    paymentRequest?.amount,
                    paymentRequest?.paymentMethod,
                    [
                        {field: 'c_pspReference', value: response?.pspReference},
                        {field: 'c_cardInstallments', value: paymentRequest?.installments?.value}
                    ]
                )
                await createOrderUsingOrderNo(adyenContext)
            } else {
                const pspReference = response?.pspReference || response?.order?.pspReference
                await updatePaymentInstrumentForOrder(adyenContext, preCreatedOrderNo, [
                    {field: 'c_pspReference', value: pspReference},
                    {field: 'c_cardInstallments', value: paymentRequest?.installments?.value}
                ])
            }
            Logger.info('sendPayments', `order confirmed: ${checkoutResponse.merchantReference}`)
        }
        Logger.info('sendPayments', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)

        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        Logger.error('sendPayments', err.stack)
        const newBasketId = await handlePaymentError(res, preCreatedOrderNo)
        if (newBasketId) {
            err.newBasketId = newBasketId
        }
        return next(err)
    }
}

export default sendPayments
