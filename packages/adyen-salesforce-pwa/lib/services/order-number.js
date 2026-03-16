import {ApiClient} from './api'

export class AdyenOrderNumberService {
    baseUrl = '/api/adyen/order-number'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async fetchOrderNumber() {
        const res = await this.apiClient.get()
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Failed to fetch order number'}))
            throw new Error(
                errorData.errorMessage || `Fetch order number failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
