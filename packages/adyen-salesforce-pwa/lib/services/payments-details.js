import {ApiClient} from './api'

export class AdyenPaymentsDetailsService {
    baseUrl = '/api/adyen/payments/details'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    /**
     * Submits additional payment details (3DS, redirect result) to Adyen.
     * @param {object} data - The Adyen state data for the details call.
     * @param {object} [options] - Order context for express flows.
     * @param {string} [options.orderNo] - Order number when the SFCC order was already created.
     * @param {boolean} [options.isTemporaryBasket] - True for the PDP express flow, so the
     * shopper's real cart is not reopened over the temporary basket on failure.
     * @returns {Promise<object>} The checkout response.
     */
    async submitPaymentsDetails(data, {orderNo, isTemporaryBasket} = {}) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data,
                orderNo,
                isTemporaryBasket
            })
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Payment details submission failed'}))
            const err = new Error(
                errorData.errorMessage || `Payment details failed with status ${res.status}`
            )
            if (errorData.newBasketId) {
                err.newBasketId = errorData.newBasketId
            }
            throw err
        }
        return await res.json()
    }
}
