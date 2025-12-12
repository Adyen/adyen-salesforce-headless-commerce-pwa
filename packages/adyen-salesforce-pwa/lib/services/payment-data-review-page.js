import {ApiClient} from './api'

/**
 * Service class for managing payment data for the review page.
 * Provides methods to get and set payment data stored on the basket.
 */
export class AdyenPaymentDataReviewPageService {
    baseUrl = '/api/adyen/payment-data-for-review-page'
    apiClient = null

    /**
     * Creates an instance of AdyenPaymentDataReviewPageService.
     * @param {string} token - The authentication token.
     * @param {string} customerId - The customer ID.
     * @param {string} basketId - The basket ID.
     * @param {object} site - The site configuration object.
     */
    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    /**
     * Retrieves payment data from the basket for the review page.
     * @async
     * @returns {Promise<object>} The payment data object, or empty object if none exists.
     * @throws {Error} If the request fails with status >= 300.
     */
    async getPaymentData() {
        const res = await this.apiClient.get()
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to get payment data for review page'}))
            throw new Error(
                errorData.message || `Get payment data failed with status ${res.status}`
            )
        }
        return await res.json()
    }

    /**
     * Stores payment data on the basket for the review page.
     * @async
     * @param {object} paymentData - The payment data to store.
     * @param {object} paymentData.details - Payment details object.
     * @param {string} paymentData.details.payerID - The payer ID.
     * @param {string} paymentData.details.orderID - The order ID.
     * @param {string} paymentData.details.paymentID - The payment ID.
     * @param {string} paymentData.details.paymentSource - The payment source (e.g., 'paypal').
     * @param {string} paymentData.paymentData - The payment data string.
     * @returns {Promise<object>} The updated basket object.
     * @throws {Error} If the request fails with status >= 300.
     */
    async setPaymentData(paymentData) {
        const res = await this.apiClient.post({
            body: JSON.stringify({paymentData})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to set payment data for review page'}))
            throw new Error(
                errorData.message || `Set payment data failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
