import {ApiClient} from './api'

export class AdyenPaymentsDetailsService {
    baseUrl = '/api/adyen/payments/details'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async submitPaymentsDetails(data) {
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
