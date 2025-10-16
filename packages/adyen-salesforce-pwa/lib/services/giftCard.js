import {ApiClient} from './api'

export class GiftCardService {
    baseUrl = '/api/adyen/gift-card'
    apiClient = null

    constructor(token, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, site)
    }

    async balanceCheck(request, customerId) {
        const res = await this.apiClient.post({
            path: '/balance-check',
            body: JSON.stringify({data: request}),
            headers: {
                customerid: customerId,
            }
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }

    async createOrder(request, customerId) {
        const res = await this.apiClient.post({
            path: '/create-order',
            body: JSON.stringify({data: request}),
            headers: {
                customerid: customerId,
            }
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }

    async cancelOrder(request, customerId) {
        const res = await this.apiClient.post({
            path: '/cancel-order',
            body: JSON.stringify({data: request}),
            headers: {
                customerid: customerId,
            }
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}