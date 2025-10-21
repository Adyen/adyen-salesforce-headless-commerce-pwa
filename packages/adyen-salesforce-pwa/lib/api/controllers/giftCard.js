import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {v4 as uuidv4} from 'uuid'
import {
    cancelAdyenOrder,
    createCheckoutResponse,
    filterStateData
} from '../helpers/paymentsHelper.js'

/**
 * Handles the Adyen gift card balance check.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export async function balanceCheck(req, res, next) {
    Logger.info('giftCards-balanceCheck', 'start')

    try {
        const {
            body: {data}
        } = req
        const {adyen: adyenContext} = res.locals
        const {basket, adyenConfig} = adyenContext
        const ordersApi = new AdyenClientProvider(adyenContext).getOrdersApi()
        const {orderTotal, productTotal, currency, c_orderNo} = basket
        const stateData = filterStateData(data)
        const request = {
            ...stateData,
            merchantAccount: adyenConfig.merchantAccount,
            reference: c_orderNo,
            amount: {
                value: getCurrencyValueForApi(orderTotal || productTotal, currency),
                currency: currency
            }
        }
        const response = await ordersApi.getBalanceOfGiftCard(request, {
            idempotencyKey: uuidv4()
        })
        await adyenContext.basketService.update({
            c_giftCardCheckBalance: JSON.stringify(response)
        })
        Logger.info('giftCards-balanceCheck', 'success')
        res.locals.response = response
        next()
    } catch (err) {
        Logger.error('giftCards-balanceCheck', err.stack)
        next(err)
    }
}

/**
 * Creates a partial payment order using an Adyen gift card.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export async function createOrder(req, res, next) {
    Logger.info('giftCards-createOrder', 'start')

    try {
        const {
            body: {data}
        } = req
        const {adyen: adyenContext} = res.locals
        const {basket, adyenConfig} = adyenContext
        const ordersApi = new AdyenClientProvider(adyenContext).getOrdersApi()
        const {orderTotal, productTotal, currency, c_orderNo} = basket

        const request = {
            ...filterStateData(data),
            reference: c_orderNo,
            merchantAccount: adyenConfig.merchantAccount,
            amount: {
                value: getCurrencyValueForApi(orderTotal || productTotal, currency),
                currency: currency
            }
        }
        const response = await ordersApi.orders(request, {
            idempotencyKey: uuidv4()
        })
        await adyenContext.basketService.update({
            c_orderData: JSON.stringify(response)
        })
        Logger.info('giftCards-createOrder', 'success')
        res.locals.response = response
        next()
    } catch (err) {
        Logger.error('giftCards-createOrder', err.stack)
        next(err)
    }
}

/**
 * Cancels a partial payment order made with an Adyen gift card.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export async function cancelOrder(req, res, next) {
    Logger.info('giftCards-cancelOrder', 'start')

    try {
        const {
            body: {data}
        } = req
        const {adyen: adyenContext} = res.locals
        const {basket} = adyenContext
        const {c_orderNo} = basket

        const response = await cancelAdyenOrder(adyenContext, data.order)

        const cancelOrderResponse = {
            ...createCheckoutResponse(response, c_orderNo),
            order: response?.order
        }

        Logger.info('giftCards-cancelOrder', 'success')
        res.locals.response = cancelOrderResponse
        next()
    } catch (err) {
        Logger.error('giftCards-cancelOrder', err.stack)
        next(err)
    }
}

export default {balanceCheck, createOrder, cancelOrder}
