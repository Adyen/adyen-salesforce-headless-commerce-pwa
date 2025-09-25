import {BaseApiClient} from './baseApiClient'

/**
 * A client for interacting with the custom Adyen order API.
 * This class extends the BaseApiClient to handle authentication and requests.
 */
export class CustomAdminOrderApiClient extends BaseApiClient {
    /**
     * @constructor
     */
    constructor() {
        const baseUrl = `https://${process.env.COMMERCE_API_SHORT_CODE}.api.commercecloud.salesforce.com/custom/adyen-order/v1/organizations/${process.env.COMMERCE_API_ORG_ID}/orders`
        super(baseUrl)
    }

    /**
     * Get an order by its order number using the custom Adyen order API.
     * @param {string} orderNo - The order number to use for the new order.
     * @returns {Promise<object>} A promise that resolves to the order object.
     */
    async getOrder(orderNo) {
        const response = await this._callAdminApi('GET', orderNo)
        return response.json()
    }
}
