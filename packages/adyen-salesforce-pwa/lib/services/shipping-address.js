import {ApiClient} from './api'

export class AdyenShippingAddressService {
    baseUrl = '/api/adyen/shipping-address'
    apiClient = null

    constructor(token, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, site)
    }

    async updateShippingAddress(basketId, data) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data
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
