import {ApiClient} from './api'

export class AdyenShopperDetailsService {
    baseUrl = '/api/adyen/shopper-details'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async updateShopperDetails(data) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data
            })
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to update shopper details'}))
            throw new Error(
                errorData.message || `Update shopper details failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
