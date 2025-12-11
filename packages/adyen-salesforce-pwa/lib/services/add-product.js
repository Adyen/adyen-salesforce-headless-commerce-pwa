import {ApiClient} from './api'

export class AdyenAddProductService {
    baseUrl = '/api/adyen/pdp/temporary-baskets/:basketId/products'
    apiClient = null

    constructor(token, customerId, site, basketId) {
        const url = this.baseUrl.replace(':basketId', basketId)
        this.apiClient = new ApiClient(url, token, customerId, basketId, site)
    }

    async addProductToBasket(product) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                product
            })
        })

        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to add product to basket'}))
            throw new Error(
                errorData.message || `Adding product to basket failed with status ${res.status}`
            )
        }

        return await res.json()
    }
}
