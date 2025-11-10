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
            const errorData = await res
                .json()
                .catch(() => ({message: 'Gift card balance check failed'}))
            throw new Error(errorData.message || `Balance check failed with status ${res.status}`)
        }
        return await res.json()
    }

    async createOrder(request) {
        const res = await this.apiClient.post({
            path: '/create-order',
            body: JSON.stringify({data: request})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Gift card order creation failed'}))
            throw new Error(errorData.message || `Create order failed with status ${res.status}`)
        }
        return await res.json()
    }

    async cancelOrder(request) {
        const res = await this.apiClient.post({
            path: '/cancel-order',
            body: JSON.stringify({data: request})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Gift card order cancellation failed'}))
            throw new Error(errorData.message || `Cancel order failed with status ${res.status}`)
        }
        return await res.json()
    }
}
