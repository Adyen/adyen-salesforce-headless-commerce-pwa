import {ApiClient} from './api'

export class AdyenShippingAddressService {
    baseUrl = '/api/adyen/shipping-address'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async updateShippingAddress(data) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data
            })
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
