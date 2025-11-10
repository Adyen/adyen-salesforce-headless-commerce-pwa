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
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to update shipping address'}))
            throw new Error(
                errorData.message || `Update shipping address failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
