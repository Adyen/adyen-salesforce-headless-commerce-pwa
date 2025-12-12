import {ApiClient} from './api'

export class AdyenPaypalUpdateOrderService {
    baseUrl = '/api/adyen/paypal-update-order'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async updatePaypalOrder(data) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data
            })
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to update paypal order'}))
            throw new Error(
                errorData.message || `Update paypal order failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
