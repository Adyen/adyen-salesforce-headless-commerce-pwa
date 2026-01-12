import {ApiClient} from './api'

export class AdyenPaymentMethodsForExpressService {
    baseUrl = '/api/adyen/paymentMethodsForExpress'
    apiClient = null

    constructor(token, customerId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, null, site)
    }

    async fetchPaymentMethodsForExpress(locale, currency) {
        const res = await this.apiClient.get({
            queryParams: {locale: locale.id, currency: currency}
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to fetch payment methods for express'}))
            throw new Error(
                errorData.message ||
                    `Fetch payment methods for express failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
