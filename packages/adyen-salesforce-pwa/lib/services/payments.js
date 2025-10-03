import {ApiClient} from './api'

export class AdyenPaymentsService {
    baseUrl = '/api/adyen/payments'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async submitPayment(adyenStateData) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data: adyenStateData
            })
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
