import {ApiClient} from './api'

export class AdyenTemporaryBasketService {
    baseUrl = '/api/adyen/pdp/temporary-baskets'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
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

    async addProductToBasket(basketId, productId, quantity = 1) {
        if (!basketId || !productId) {
            throw new Error('Basket ID and Product ID are required')
        }
        if (quantity < 1) {
            throw new Error('Quantity must be at least 1')
        }

        const res = await this.apiClient.post({
            path: `/${basketId}/items`,
            body: JSON.stringify({productId, quantity})
        })

        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to add product to basket'}))
            throw new Error(errorData.message || 'Failed to add product to basket')
        }

        return await res.json()
    }
}
