import {BaseApiClient} from './baseApiClient'

/**
 * A client for interacting with the Salesforce Commerce Cloud Checkout/Orders API.
 * This class extends the BaseApiClient to handle authentication and requests.
 */
export class OrderApiClient extends BaseApiClient {
    /**
     * @constructor
     */
    constructor() {
        const baseUrl = `https://${process.env.COMMERCE_API_SHORT_CODE}.api.commercecloud.salesforce.com/checkout/orders/v1/organizations/${process.env.COMMERCE_API_ORG_ID}/orders`
        super(baseUrl)
    }

    /**
     * A private helper to update various status types on an order.
     * @param {string} orderNo - The order number.
     * @param {string} statusType - The type of status to update (e.g., 'status', 'payment-status').
     * @param {string} status - The new status value.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     * @private
     */
    async #updateStatus(orderNo, statusType, status) {
        return this._callAdminApi('PUT', `${orderNo}/${statusType}`, {
            body: JSON.stringify({status: status})
        })
    }

    /**
     * Gets an order by its order number.
     * @param {string} orderNo - The order number.
     * @returns {Promise<object>} A promise that resolves to the order object.
     */
    async getOrder(orderNo) {
        const response = await this._callAdminApi('GET', orderNo)
        return response.json()
    }

    /**
     * Updates the status of an order.
     * @param {string} orderNo - The order number.
     * @param {string} status - The new order status.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     */
    async updateOrderStatus(orderNo, status) {
        return this.#updateStatus(orderNo, 'status', status)
    }

    /**
     * Updates the payment status of an order.
     * @param {string} orderNo - The order number.
     * @param {string} status - The new payment status.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     */
    async updateOrderPaymentStatus(orderNo, status) {
        return this.#updateStatus(orderNo, 'payment-status', status)
    }

    /**
     * Updates the export status of an order.
     * @param {string} orderNo - The order number.
     * @param {string} status - The new export status.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     */
    async updateOrderExportStatus(orderNo, status) {
        return this.#updateStatus(orderNo, 'export-status', status)
    }

    /**
     * Updates the confirmation status of an order.
     * @param {string} orderNo - The order number.
     * @param {string} status - The new confirmation status.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     */
    async updateOrderConfirmationStatus(orderNo, status) {
        return this.#updateStatus(orderNo, 'confirmation-status', status)
    }

    /**
     * Updates an order's payment transaction with the external PSP reference.
     * @param {string} orderNo - The order number.
     * @param {string} paymentInstrumentId - The ID of the payment instrument.
     * @param {string} pspReference - The Adyen PSP reference for the transaction.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     */
    async updateOrderPaymentTransaction(orderNo, paymentInstrumentId, pspReference) {
        const response = await this._callAdminApi(
            'PATCH',
            `${orderNo}/payment-instruments/${paymentInstrumentId}/transaction`,
            {
                body: JSON.stringify({
                    c_externalReferenceCode: pspReference
                })
            }
        )
        return response
    }
}
