import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'

/**
 * Creates and configures an instance of the ShopperCustomers API client.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} siteId - The site ID for the API client.
 * @returns {ShopperCustomers} An instance of the ShopperCustomers client.
 */
export function createShopperCustomerClient(authorization, siteId) {
    const {app: appConfig} = getConfig()
    return new ShopperCustomers({
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
 * @param {string} customerId - The ID of the customer who is expected to own the basket.
 * @param {string} siteId - The site ID for the API client.
 * @returns {Promise<object>} A promise that resolves to the customer object.
 * @throws {AdyenError} If the basket is not found or does not belong to the customer.
 */
export async function getCustomer(authorization, customerId, siteId) {
    const shopperCustomers = createShopperCustomerClient(authorization, siteId)
    const customer = await shopperCustomers.getCustomer({
        parameters: {
            customerId: customerId
        }
    })

    if (!customer) {
        throw new AdyenError(ERROR_MESSAGE.CUSTOMER_NOT_FOUND, 404)
    }

    return customer
}

export async function getCustomerBaskets(authorization, customerId, siteId) {
    const shopperCustomersClient = createShopperCustomerClient(authorization, siteId)
    return await shopperCustomersClient.getCustomerBaskets({
        parameters: {
            customerId: customerId
        }
    })
}
