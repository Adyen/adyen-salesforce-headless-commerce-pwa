import {ApiClient} from './api'

export class AdyenPaymentsService {
    baseUrl = '/api/adyen/payments'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async submitPayment(adyenStateData, locale) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data: adyenStateData
            }),
            queryParams: {locale: locale?.id}
        })
        if (res.status >= 300) {
            const errorData = await res.json().catch(() => ({message: 'Payment submission failed'}))
            throw new Error(errorData.message || `Payment failed with status ${res.status}`)
        }
        return await res.json()
    }
}
