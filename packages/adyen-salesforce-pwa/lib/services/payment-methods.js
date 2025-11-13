import {ApiClient} from './api'

export class AdyenPaymentMethodsService {
    baseUrl = '/api/adyen/paymentMethods'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async fetchPaymentMethods(locale) {
        const res = await this.apiClient.get({
            queryParams: {locale: locale.id}
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to fetch payment methods'}))
            throw new Error(
                errorData.message || `Fetch payment methods failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
