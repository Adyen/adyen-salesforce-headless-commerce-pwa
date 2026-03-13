import {ApiClient} from './api'

export class PaymentCancelService {
    baseUrl = '/api/adyen/payment'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async paymentCancel(orderNo) {
        const res = await this.apiClient.post({
            path: '/cancel',
            body: JSON.stringify({
                orderNo
            })
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Payment cancellation failed'}))
            throw new Error(
                errorData.errorMessage || `Payment cancel failed with status ${res.status}`
            )
        }
        return await res.json()
    }

    /**
     * Cancels an abandoned payment session.
     * @async
     * @param {string} [reason='abandoned_session'] - The reason for cancellation.
     * @returns {Promise<object>} The cancellation response.
     * @throws {Error} If the request fails with status >= 300.
     */
    async cancelAbandonedPayment(reason = 'abandoned_session', orderNo) {
        const res = await this.apiClient.post({
            path: '/cancel',
            body: JSON.stringify({reason, ...(orderNo && {orderNo})})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Abandoned payment cancellation failed'}))
            throw new Error(
                errorData.errorMessage ||
                    `Abandoned payment cancel failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
