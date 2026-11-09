import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config.js'
import {ShopperOrders} from 'commerce-sdk-isomorphic'
import {AdyenError} from '../models/AdyenError.js'
import {OrderApiClient} from '../models/orderApi.js'
import {CustomShopperOrderApiClient} from '../models/customShopperOrderApi.js'
import {CustomAdminOrderApiClient} from '../models/customAdminOrderApi.js'
import {
    createShopperBasketsClient,
    getBasket,
    getCurrentBasketForAuthorizedShopper
} from './basketHelper'
import {createShopperCustomerClient, getCustomerBaskets} from './customerHelper'
import {BasketService} from '../models/basketService.js'
import {ERROR_MESSAGE, ORDER} from '../../utils/constants.mjs'
import {cleanupReopenedBasket} from './paymentsHelper'
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
                status: ORDER.ORDER_STATUS_CREATED,
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

export async function resolveReopenedBasket({
    authorization,
    customerId,
    siteId,
    basketIdFromLocation
}) {
    if (basketIdFromLocation) {
        try {
            return await getBasket(authorization, basketIdFromLocation, customerId, siteId)
        } catch (err) {
            Logger.info(
                'resolveReopenedBasket',
                `Location basket ${basketIdFromLocation} not usable (${err?.statusCode ?? 'unknown'}: ${err?.message ?? String(err)}), falling back`
            )
        }
    }
    try {
        return await getCurrentBasketForAuthorizedShopper(authorization, customerId, siteId)
    } catch (err) {
        Logger.error(
            'resolveReopenedBasket',
            `Could not resolve reopened basket: ${err?.statusCode ?? 'unknown'}: ${err?.message ?? String(err)}`
        )
    }
    return null
}

/**
 * Fails an SFCC order and, by default, triggers the reopening of the associated basket.
 * It validates that the order belongs to the customer, deletes all existing shopper baskets,
 * then updates the order status to failed_with_reopen so SFCC creates a clean new basket.
 * Resolves the new basket ID from the Location header if present, otherwise falls back to
 * fetching the shopper's current basket. Clears c_orderNo and payment instruments on the new basket.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {string} orderNo - The number of the order to fail.
 * @param {object} [options] - Reopen behaviour.
 * @param {boolean} [options.reopenBasket=true] - When false, the order is simply failed and no
 * basket is deleted or reopened. Used for orders created from a temporary (PDP express) basket,
 * where the shopper's real cart must survive.
 * @param {boolean} [options.removeShippingAddress=false] - When true, the shipping address is
 * cleared on the reopened basket, resetting express checkout state.
 * @returns {Promise<string|null>} The new basket ID, or null if it could not be resolved.
 * @throws {AdyenError} If the order is not found or does not belong to the customer.
 */
export async function failOrderAndReopenBasket(adyenContext, orderNo, options = {}) {
    Logger.info('failOrderAndReopenBasket', 'start')
    const {reopenBasket = true, removeShippingAddress = false} = options
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
    if (reopenBasket) {
        if (order.status !== ORDER.ORDER_STATUS_CREATED) {
            Logger.info(
                'failOrderAndReopenBasket',
                `Order ${orderNo} is ${order.status}; skipping fail and reopen`
            )
            const currentBasket = await resolveReopenedBasket({
                authorization,
                customerId,
                siteId,
                basketIdFromLocation: null
            })
            if (!currentBasket) {
                return null
            }
            if (currentBasket.c_orderNo !== orderNo) {
                Logger.info(
                    'failOrderAndReopenBasket',
                    `Current basket does not reference order ${orderNo}; skipping cleanup`
                )
                return null
            }
            try {
                const tempContext = {...adyenContext, basket: currentBasket}
                const tempRes = {locals: {adyen: tempContext}}
                tempContext.basketService = new BasketService(tempContext, tempRes)
                await cleanupReopenedBasket(tempContext, 'failOrderAndReopenBasket')
                return currentBasket.basketId
            } catch (err) {
                Logger.error(
                    'failOrderAndReopenBasket',
                    `Failed to clean up current basket: ${err.message}`
                )
            }
            return null
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
    }
    const orderApi = new OrderApiClient(siteId)
    const response = await orderApi.updateOrderStatus(
        order.orderNo,
        reopenBasket ? ORDER.ORDER_STATUS_FAILED_REOPEN : ORDER.ORDER_STATUS_FAILED
    )

    if (!reopenBasket) {
        Logger.info('failOrderAndReopenBasket', 'order failed without reopening a basket')
        return null
    }

    const location = response?.headers?.get('Location')
    const match = location?.match(/baskets\/([^?/]+)/)
    let newBasketId = match ? match[1] : null

    const reopenedBasket = await resolveReopenedBasket({
        authorization,
        customerId,
        siteId,
        basketIdFromLocation: newBasketId
    })
    if (reopenedBasket?.basketId) {
        newBasketId = reopenedBasket.basketId
    }
    if (reopenedBasket) {
        try {
            const tempContext = {...adyenContext, basket: reopenedBasket}
            const tempRes = {locals: {adyen: tempContext}}
            tempContext.basketService = new BasketService(tempContext, tempRes)
            await cleanupReopenedBasket(tempContext, 'failOrderAndReopenBasket')
            if (removeShippingAddress) {
                await tempContext.basketService.removeShippingAddress()
            }
        } catch (err) {
            Logger.error(
                'failOrderAndReopenBasket',
                `Failed to clean up new basket: ${err.message}`
            )
        }
    }
    Logger.info('failOrderAndReopenBasket', 'success')
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
    let order
    try {
        order = await shopperOrders.getOrder({
            parameters: {
                orderNo: orderNo
            }
        })
    } catch (err) {
        if (err?.statusCode !== 404 && err?.status !== 404) {
            throw err
        }
    }
    if (order?.orderNo && order.status === ORDER.ORDER_STATUS_CREATED) {
        return order
    }
    if (order?.orderNo) {
        throw new AdyenError(ERROR_MESSAGE.ORDER_ALREADY_PLACED, 409)
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
 * Retrieves an SFCC order payment instrument with updated custom properties.
 * This function uses an admin-level API client to fetch order details.
 * @param {string} orderNo - The number of the order to retrieve.
 * @param {string} siteId - The site ID.
 * @param {string} pspReference - The Adyen PSP reference from the /payments or /payments/details response.
 * @param {object} customProperties - The custom properties to update on the payment instrument.
 * @returns {Promise<object>} A promise that resolves to the order object.
 */
export async function updateOrderPaymentInstrument(
    orderNo,
    siteId,
    pspReference,
    customProperties
) {
    const customOrderApi = new CustomAdminOrderApiClient(siteId)
    return await customOrderApi.updateOrderPaymentInstrument(
        orderNo,
        pspReference,
        customProperties
    )
}
