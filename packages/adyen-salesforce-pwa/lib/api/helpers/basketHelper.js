import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ShopperBasketsV2} from 'commerce-sdk-isomorphic'
import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getCustomerBaskets} from './customerHelper.js'
import Logger from '../models/logger'

/**
 * Creates and configures an instance of the ShopperBaskets API client.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} siteId - The site ID for the API client.
 * @returns {ShopperBaskets} An instance of the ShopperBaskets client.
 */
export function createShopperBasketsClient(authorization, siteId) {
    const {app: appConfig} = getConfig()
    return new ShopperBasketsV2({
        ...appConfig.commerceAPI,
        parameters: {
            ...appConfig.commerceAPI.parameters,
            siteId
        },
        headers: {authorization}
    })
}

/**
 * Retrieves a basket by its ID and validates that it belongs to the specified customer.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} basketId - The ID of the basket to retrieve.
 * @param {string} customerId - The ID of the customer who is expected to own the basket.
 * @param {string} siteId - The site ID for the API client.
 * @returns {Promise<object>} A promise that resolves to the basket object.
 * @throws {AdyenError} If the basket is not found or does not belong to the customer.
 */
export async function getBasket(authorization, basketId, customerId, siteId) {
    const shopperBaskets = createShopperBasketsClient(authorization, siteId)
    const basket = await shopperBaskets.getBasket({
        parameters: {
            basketId: basketId
        }
    })
    if (!basket) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404)
    }
    if (basket?.customerInfo?.customerId !== customerId) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404, basket)
    }

    return basket
}

/**
 * Retrieves the current basket for an authorized shopper.
 * This is useful when the basket ID is not known upfront.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} customerId - The shopper's customer ID.
 * @returns {Promise<object>} A promise that resolves to the shopper's current basket.
 * @throws {AdyenError} If no baskets are found for the customer.
 */
export async function getCurrentBasketForAuthorizedShopper(authorization, customerId, siteId) {
    const {baskets} = await getCustomerBaskets(authorization, customerId, siteId)

    if (!baskets?.length) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404)
    }

    return baskets[0]
}

/**
 * Removes any existing temporary baskets for the current customer.
 */
export async function removeExistingTemporaryBaskets(authorization, customerId, siteId) {
    try {
        const shopperBaskets = createShopperBasketsClient(authorization, siteId)
        const existingBaskets = await getCustomerBaskets(authorization, customerId, siteId)
        const tempBaskets = existingBaskets.baskets?.filter((b) => b?.temporaryBasket === true)
        if (tempBaskets?.length) {
            await Promise.all(
                tempBaskets.map((b) =>
                    shopperBaskets.deleteBasket({
                        parameters: {basketId: b.basketId}
                    })
                )
            )
        }
    } catch (e) {
        Logger.error('removeExistingTemporaryBaskets', e.stack || e.message)
    }
}

/**
 * Creates a new temporary basket for the current shopper.
 * @returns {Promise<object>} The created basket.
 */
export async function createTemporaryBasket(authorization, customerId, siteId) {
    const shopperBaskets = createShopperBasketsClient(authorization, siteId)
    const basket = await shopperBaskets.createBasket({
        parameters: {
            temporary: true
        },
        body: {
            customerInfo: {
                customerId
            }
        }
    })
    return basket
}
