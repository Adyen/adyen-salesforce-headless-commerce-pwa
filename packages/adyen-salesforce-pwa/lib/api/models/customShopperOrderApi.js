import {BaseApiClient} from './baseApiClient'

/**
 * A client for interacting with the custom Adyen order API.
 * This class extends the BaseApiClient to handle authentication and requests.
 */
export class CustomShopperOrderApiClient extends BaseApiClient {
    /**
     * @constructor
     */
    constructor() {
        const baseUrl = `https://${process.env.COMMERCE_API_SHORT_CODE}.api.commercecloud.salesforce.com/custom/adyen-shopper-order/v1/organizations/${process.env.COMMERCE_API_ORG_ID}`
        super(baseUrl)
    }

    /**
     * Generates a new unique order number via the custom Adyen shopper order API.
     * @param {string} authorization - SLAS access token for the shopper.
     * @returns {Promise<string>} A promise that resolves to the generated order number.
     */
    async generateOrderNo(authorization) {
        const response = await this._callShopperApi('GET', 'orders/order-number', {
            headers: {authorization}
        })
        const data = await response.json()
        return data.orderNo
    }

    /**
     * Creates an order from a basket using the custom Adyen order API.
     * @param {string} authorization - SLAS access token for the shopper.
     * @param {string} basketId - The ID of the basket to create an order from.
     * @param {string} customerId - The ID of the customer.
     * @param {string} orderNo - The order number to use for the new order.
     * @param {string} currency - The currency code for the new order.
     * @returns {Promise<object>} A promise that resolves to the created order object.
     */
    async createOrder(authorization, basketId, customerId, orderNo, currency) {
        const response = await this._callShopperApi('POST', 'orders', {
            body: JSON.stringify({
                basketId: basketId,
                customerId: customerId,
                orderNo: orderNo,
                currency: currency
            }),
            headers: {authorization}
        })
        return response.json()
    }
}
