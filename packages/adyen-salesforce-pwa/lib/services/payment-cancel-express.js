import {ApiClient} from './api'

export class PaymentCancelExpressService {
    baseUrl = '/api/adyen/payment'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    /**
     * Cancels an express payment.
     * @param {object} [options] - Cancellation options.
     * @param {string} [options.orderNo] - Order number when the SFCC order was already created.
     * @param {boolean} [options.isTemporaryBasket] - True for the PDP express flow, so the
     * shopper's real cart is not reopened over the temporary basket.
     * @returns {Promise<object>} The cancellation response, including newBasketId when reopened.
     */
    async paymentCancelExpress({orderNo, isTemporaryBasket} = {}) {
        const res = await this.apiClient.post({
            path: '/cancel/express',
            body: JSON.stringify({orderNo, isTemporaryBasket})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Express payment cancellation failed'}))
            throw new Error(
                errorData.errorMessage || `Express payment cancel failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
