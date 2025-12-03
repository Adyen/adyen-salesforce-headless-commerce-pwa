import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'

/**
 * Creates and configures an instance of the ShopperCustomers API client.
 * @param {string} authorization - The shopper's authorization token.
 * @returns {ShopperCustomers} An instance of the ShopperCustomers client.
 */
export function createShopperCustomerClient(authorization) {
    const {app: appConfig} = getConfig()
    return new ShopperCustomers({
        ...appConfig.commerceAPI,
        headers: {authorization}
    })
}

/**
 * Retrieves a basket by its ID and validates that it belongs to the specified customer.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} customerId - The ID of the customer who is expected to own the basket.
 * @returns {Promise<object>} A promise that resolves to the customer object.
 * @throws {AdyenError} If the basket is not found or does not belong to the customer.
 */
export async function getCustomer(authorization, customerId) {
    const shopperCustomers = createShopperCustomerClient(authorization)
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
