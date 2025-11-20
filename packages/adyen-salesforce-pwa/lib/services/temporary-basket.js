import {ApiClient} from './api'

export class AdyenTemporaryBasketService {
    baseUrl = '/api/adyen/pdp/temporary-basket'
    apiClient = null

    constructor(token, customerId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, null, site)
    }

    async createTemporaryBasket(product) {
        const body = product ? {product} : {}
        const res = await this.apiClient.post({
            body: JSON.stringify(body)
        })

        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to create temporary basket'}))
            throw new Error(
                errorData.message || `Create temporary basket failed with status ${res.status}`
            )
        }

        return await res.json()
    }
}
