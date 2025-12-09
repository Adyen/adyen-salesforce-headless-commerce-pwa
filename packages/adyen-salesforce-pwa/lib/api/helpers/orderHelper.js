import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config.js'
import {ShopperOrders} from 'commerce-sdk-isomorphic'
import {AdyenError} from '../models/AdyenError.js'
import {OrderApiClient} from '../models/orderApi.js'
import {CustomShopperOrderApiClient} from '../models/customShopperOrderApi.js'
import {CustomAdminOrderApiClient} from '../models/customAdminOrderApi.js'
import {ERROR_MESSAGE, ORDER} from '../../utils/constants.mjs'

/**
 * Creates and configures an instance of the ShopperOrders API client.
 * @param {string} authorization - The shopper's authorization token.
 * @returns {ShopperOrders} An instance of the ShopperOrders client.
 */
export function createShopperOrderClient(authorization) {
    const {app: appConfig} = getConfig()
    return new ShopperOrders({
        ...appConfig.commerceAPI,
        headers: {authorization}
    })
}

/**
 * Fails an SFCC order and triggers the reopening of the associated basket.
 * It validates that the order belongs to the customer before updating its status.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {string} orderNo - The number of the order to fail.
 * @returns {Promise<void>}
 * @throws {AdyenError} If the order is not found or does not belong to the customer.
 */
export async function failOrderAndReopenBasket(adyenContext, orderNo) {
    const {authorization, customerId} = adyenContext
    const shopperOrders = createShopperOrderClient(authorization)

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
    const orderApi = new OrderApiClient()
    await orderApi.updateOrderStatus(order.orderNo, ORDER.ORDER_STATUS_FAILED_REOPEN)
}

/**
 * Creates an SFCC order from a basket, using a pre-generated order number.
 * It first checks if an order with the given number already exists to prevent duplicates.
 * @param {object} adyenContext - The request context from `res.locals.adyen`.
 * @param {string} paymentFlow - The type of payment being processed.
 * @returns {Promise<object>} A promise that resolves to the newly created order object.
 * @throws {AdyenError} If an order with the given orderNo already exists.
 */
export async function createOrderUsingOrderNo(adyenContext, paymentFlow) {
    const {authorization, basket, customerId} = adyenContext
    const {c_orderNo: orderNo, basketId, currency} = basket
    const shopperOrders = createShopperOrderClient(authorization)
    const order = await shopperOrders.getOrder({
        parameters: {
            orderNo: orderNo
        }
    })
    if (order?.orderNo) {
        throw new AdyenError(ERROR_MESSAGE.ORDER_ALREADY_EXISTS, 409)
    }
    const customOrderApi = new CustomShopperOrderApiClient()
    return await customOrderApi.createOrder(
        authorization,
        basketId,
        customerId,
        orderNo,
        currency,
        paymentFlow
    )
}

/**
 * Retrieves an SFCC order using its order number.
 * This function uses an admin-level API client to fetch order details.
 * @param {string} orderNo - The number of the order to retrieve.
 * @returns {Promise<object>} A promise that resolves to the order object.
 */
export async function getOrderUsingOrderNo(orderNo) {
    const customOrderApi = new CustomAdminOrderApiClient()
    return await customOrderApi.getOrder(orderNo)
}
