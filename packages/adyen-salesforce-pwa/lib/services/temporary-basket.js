import {ApiClient} from './api'

export class AdyenTemporaryBasketService {
    baseUrl = '/api/adyen/pdp/temporary-baskets'
    apiClient = null

    constructor(token, customerId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, null, site)
    }

    async createTemporaryBasket() {
        const res = await this.apiClient.post()

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
