import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config.js'
import {ShopperOrders} from 'commerce-sdk-isomorphic'
import {AdyenError} from '../models/AdyenError.js'
import {OrderApiClient} from '../models/orderApi.js'
import {CustomShopperOrderApiClient} from '../models/customShopperOrderApi.js'
import {CustomAdminOrderApiClient} from '../models/customAdminOrderApi.js'
import {
    getBasket,
    getCurrentBasketForAuthorizedShopper,
    createShopperBasketsClient
} from '../helpers/basketHelper.js'
import {getCustomerBaskets, createShopperCustomerClient} from '../helpers/customerHelper.js'
import {BasketService} from '../models/basketService.js'
import {
    ERROR_MESSAGE,
    ORDER,
    PAYMENT_METHOD_TYPES,
    PAYMENT_METHODS
} from '../../utils/constants.mjs'
import {convertCurrencyValueToMajorUnits} from '../../utils/parsers.mjs'
import {getCardType} from '../../utils/getCardType.mjs'
import Logger from '../models/logger.js'

/**
 * Returns the most recent order in 'New' status for the shopper, or null if none found.
 * Used to detect redirect payments (e.g. Klarna) where the basket was already consumed
 * into the order before the redirect, leaving no c_orderNo on the basket.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} customerId - The shopper's customer ID.
 * @param {string} siteId - The site ID for the API client.
 * @returns {Promise<object|null>}
 */
export async function getOpenOrderForShopper(authorization, customerId, siteId) {
    try {
        const shopperCustomers = createShopperCustomerClient(authorization, siteId)
        const result = await shopperCustomers.getCustomerOrders({
            parameters: {
                customerId,
                status: ORDER.ORDER_STATUS_NEW,
                limit: 1
            }
        })
        return result?.data?.[0] ?? null
    } catch (err) {
        Logger.error('getOpenOrderForShopper', err.message)
        return null
    }
}

/**
 * Creates and configures an instance of the ShopperOrders API client.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} siteId - The site ID for the API client.
 * @returns {ShopperOrders} An instance of the ShopperOrders client.
 */
export function createShopperOrderClient(authorization, siteId) {
    const {app: appConfig} = getConfig()
    return new ShopperOrders({
        ...appConfig.commerceAPI,
        parameters: {
            ...appConfig.commerceAPI.parameters,
            siteId: siteId || appConfig.commerceAPI.parameters.siteId
        },
        headers: {authorization}
    })
}

/**
 * Fails an SFCC order and triggers the reopening of the associated basket.
 * It validates that the order belongs to the customer, deletes all existing shopper baskets,
 * then updates the order status to failed_with_reopen so SFCC creates a clean new basket.
 * Resolves the new basket ID from the Location header if present, otherwise falls back to
 * fetching the shopper's current basket. Clears c_orderNo and payment instruments on the new basket.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {string} orderNo - The number of the order to fail.
 * @returns {Promise<string|null>} The new basket ID, or null if it could not be resolved.
 * @throws {AdyenError} If the order is not found or does not belong to the customer.
 */
export async function failOrderAndReopenBasket(adyenContext, orderNo) {
    const {authorization, customerId, siteId} = adyenContext
    const shopperOrders = createShopperOrderClient(authorization, siteId)

    const order = await shopperOrders.getOrder({
        parameters: {
            orderNo: orderNo
        }
    })
    if (!order?.orderNo) {
        throw new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 404)
    }
    if (order?.customerInfo?.customerId !== customerId) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_ORDER, 404)
    }
    try {
        const shopperBaskets = createShopperBasketsClient(authorization, siteId)
        const {baskets} = await getCustomerBaskets(authorization, customerId, siteId)
        if (baskets?.length) {
            await Promise.all(
                baskets.map((b) =>
                    shopperBaskets.deleteBasket({parameters: {basketId: b.basketId}})
                )
            )
        }
    } catch (err) {
        Logger.error(
            'failOrderAndReopenBasket',
            `Failed to delete existing baskets: ${err.message}`
        )
    }

    const orderApi = new OrderApiClient(siteId)
    const response = await orderApi.updateOrderStatus(
        order.orderNo,
        ORDER.ORDER_STATUS_FAILED_REOPEN
    )
    const location = response?.headers?.get('Location')
    const match = location?.match(/baskets\/([^?/]+)/)
    let newBasketId = match ? match[1] : null

    try {
        const newBasket = newBasketId
            ? await getBasket(authorization, newBasketId, customerId, siteId)
            : await getCurrentBasketForAuthorizedShopper(authorization, customerId, siteId)
        newBasketId = newBasket?.basketId
        const tempContext = {authorization, siteId, basket: newBasket}
        const tempRes = {locals: {adyen: tempContext}}
        const basketService = new BasketService(tempContext, tempRes)
        await basketService.update({c_orderNo: ''})
        if (newBasket?.paymentInstruments?.length) {
            await basketService.removeAllPaymentInstruments()
        }
    } catch (err) {
        Logger.error('failOrderAndReopenBasket', `Failed to clean up new basket: ${err.message}`)
    }
    return newBasketId
}

/**
 * Creates an SFCC order from a basket, using a pre-generated order number.
 * If an order with the given orderNo already exists (e.g. pre-created in
 * payments.js for a standard 3DS flow), it returns the existing order without re-creating it.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @returns {Promise<object>} A promise that resolves to the existing or newly created order object.
 */
export async function createOrderUsingOrderNo(adyenContext) {
    const {authorization, basket, customerId, siteId} = adyenContext
    const {c_orderNo: orderNo, basketId, currency} = basket
    if (!orderNo) {
        throw new AdyenError(ERROR_MESSAGE.ORDER_NUMBER_NOT_FOUND, 400)
    }
    const shopperOrders = createShopperOrderClient(authorization, siteId)
    const order = await shopperOrders.getOrder({
        parameters: {
            orderNo: orderNo
        }
    })
    if (order?.orderNo) {
        return order
    }
    const customOrderApi = new CustomShopperOrderApiClient(siteId)
    return await customOrderApi.createOrder(authorization, basketId, customerId, orderNo, currency)
}

/**
 * Retrieves an SFCC order using its order number.
 * This function uses an admin-level API client to fetch order details.
 * @param {string} orderNo - The number of the order to retrieve.
 * @param {string} siteId - The site ID.
 * @returns {Promise<object>} A promise that resolves to the order object.
 */
export async function getOrderUsingOrderNo(orderNo, siteId) {
    const customOrderApi = new CustomAdminOrderApiClient(siteId)
    return await customOrderApi.getOrder(orderNo)
}

/**
 * Updates the custom pspReference on the payment instrument of a pre-created SFCC order.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {string} orderNo - The order number.
 * @param {string} pspReference - The Adyen PSP reference from the /payments or /payments/details response.
 * @returns {Promise<void>}
 */
export async function updatePaymentInstrumentForOrder(adyenContext, orderNo, pspReference) {
    const {authorization, siteId} = adyenContext
    Logger.info('updatePaymentInstrumentForOrder', `start  — orderNo: ${orderNo}`)
    const shopperOrders = createShopperOrderClient(authorization, siteId)
    const order = await shopperOrders.getOrder({
        parameters: {
            orderNo: orderNo
        }
    })
    const firstPaymentInstrument = order?.paymentInstruments?.find(
        (pi) => pi.c_paymentMethodType !== PAYMENT_METHOD_TYPES.GIFT_CARD
    )
    if (!firstPaymentInstrument?.paymentInstrumentId) {
        Logger.info(
            'updatePaymentInstrumentForOrder',
            'no non-gift-card payment instrument found on order — skipping'
        )
        return
    }
    const {paymentInstrumentId, ...paymentInstrument} = firstPaymentInstrument
    await shopperOrders.updatePaymentInstrumentForOrder({
        parameters: {
            orderNo: orderNo,
            paymentInstrumentId: paymentInstrumentId
        },
        body: {
            ...paymentInstrument,
            ...(pspReference && {c_pspReference: pspReference})
        }
    })
    Logger.info(
        'updatePaymentInstrumentForOrder',
        `success — paymentInstrumentId: ${paymentInstrumentId}`
    )
}
