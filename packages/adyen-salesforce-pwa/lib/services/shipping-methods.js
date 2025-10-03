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
            throw new Error(res)
        } else {
            return await res.json()
        }
    }

    async updateShippingMethod(shippingMethodId) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                shippingMethodId
            })
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
