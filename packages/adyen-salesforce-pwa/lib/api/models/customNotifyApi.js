import {BaseApiClient} from './baseApiClient'

/**
 * A client for interacting with the custom Adyen notify API.
 * This class extends the BaseApiClient to handle authentication and requests.
 */
export class CustomNotifyApiClient extends BaseApiClient {
    /**
     * @constructor
     */
    constructor() {
        const baseUrl = `https://${process.env.COMMERCE_API_SHORT_CODE}.api.commercecloud.salesforce.com/custom/adyen-notify/v1/organizations/${process.env.COMMERCE_API_ORG_ID}`
        super(baseUrl)
    }

    /**
     * Sends a notification to the custom Adyen notify API.
     * @param {object} notification - The notification object to be sent.
     * @returns {Promise<object>} A promise that resolves to the response object.
     */
    async notify(notification) {
        const response = await this._callAdminApi('POST', `notify`, {
            body: JSON.stringify({notificationData: notification})
        })
        return response.json()
    }
}
