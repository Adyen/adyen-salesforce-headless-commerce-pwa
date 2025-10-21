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
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
