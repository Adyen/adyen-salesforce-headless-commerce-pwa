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
     * Creates an order from a basket using the custom Adyen order API.
     * @param {string} authorization - SLAS access token for the shopper.
     * @param {string} basketId - The ID of the basket to create an order from.
     * @param {string} customerId - The ID of the customer.
     * @param {string} orderNo - The order number to use for the new order.
     * @returns {Promise<object>} A promise that resolves to the created order object.
     */
    async createOrder(authorization, basketId, customerId, orderNo) {
        const response = await this._callShopperApi('POST', 'orders', {
            body: JSON.stringify({
                basketId: basketId,
                customerId: customerId,
                orderNo: orderNo
            }),
            headers: {authorization}

        })
        return response.json()
    }
}