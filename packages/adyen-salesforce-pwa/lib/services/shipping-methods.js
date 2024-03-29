import {ApiClient} from './api'

export class AdyenShippingMethodsService {
    baseUrl = '/api/adyen/shipping-methods'
    apiClient = null

    constructor(token, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, site)
    }

    async updateShippingMethod(shippingMethodId, basketId) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                shippingMethodId
            }),
            headers: {
                basketid: basketId
            }
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
