import {ApiClient} from './api'

export class GiftCardService {
    baseUrl = '/api/adyen/gift-card'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async balanceCheck(request) {
        const res = await this.apiClient.post({
            path: '/balance-check',
            body: JSON.stringify({data: request})
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }

    async createOrder(request) {
        const res = await this.apiClient.post({
            path: '/create-order',
            body: JSON.stringify({data: request})
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }

    async cancelOrder(request) {
        const res = await this.apiClient.post({
            path: '/cancel-order',
            body: JSON.stringify({data: request})
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
