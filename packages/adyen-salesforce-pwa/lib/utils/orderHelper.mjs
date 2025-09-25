import {getConfig} from "@salesforce/pwa-kit-runtime/utils/ssr-config.js";
import {ShopperOrders} from "commerce-sdk-isomorphic";
import {AdyenError} from "../api/models/AdyenError.js";
import {CustomShopperOrderApiClient, CustomAdminOrderApiClient, OrderApiClient} from "../api/index.js";
import {ERROR_MESSAGE, ORDER} from "./constants.mjs";

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
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} customerId - The ID of the customer.
 * @param {string} orderNo - The number of the order to fail.
 * @returns {Promise<void>}
 * @throws {AdyenError} If the order is not found or does not belong to the customer.
 */
export async function failOrderAndReopenBasket(authorization, customerId, orderNo) {
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
    await orderApi.updateOrderStatus(order.orderNo, ORDER.ORDER_STATUS_FAILED_REOPEN);
}

/**
 * Creates an SFCC order from a basket, using a pre-generated order number.
 * It first checks if an order with the given number already exists to prevent duplicates.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} basketId - The ID of the basket to create the order from.
 * @param {string} customerId - The ID of the customer.
 * @param {string} orderNo - The order number to check for existence and to use for the new order.
 * @returns {Promise<object>} A promise that resolves to the newly created order object.
 * @throws {AdyenError} If an order with the given orderNo already exists.
 */
export async function createOrderUsingOrderNo(authorization, basketId, customerId, orderNo) {
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
    return await customOrderApi.createOrder(authorization, basketId, customerId, orderNo)
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