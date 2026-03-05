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
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Payment details submission failed'}))
            const err = new Error(
                errorData.errorMessage || `Payment details failed with status ${res.status}`
            )
            if (errorData.newBasketId) {
                err.newBasketId = errorData.newBasketId
            }
            throw err
        }
        return await res.json()
    }
}
