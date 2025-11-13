import {ApiClient} from './api'

export class AdyenShippingMethodsService {
    baseUrl = '/api/adyen/shipping-methods'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async getShippingMethods() {
        const res = await this.apiClient.get()
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to get shipping methods'}))
            throw new Error(
                errorData.message || `Get shipping methods failed with status ${res.status}`
            )
        }
        return await res.json()
    }

    async updateShippingMethod(shippingMethodId) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                shippingMethodId
            })
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to update shipping method'}))
            throw new Error(
                errorData.message || `Update shipping method failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
