import {ApiClient} from './api'

export class AdyenPaymentMethodsService {
    baseUrl = '/api/adyen/paymentMethods'
    apiClient = null

    constructor(token, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, site)
    }

    async fetchPaymentMethods(customerId, locale) {
        const res = await this.apiClient.get({
            queryParams: {locale: locale.id},
            headers: {
                customerid: customerId
            }
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
