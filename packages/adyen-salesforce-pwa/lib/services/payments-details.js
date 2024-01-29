import {ApiClient} from './api'

export class AdyenPaymentsDetailsService {
    baseUrl = '/api/adyen/payments/details'
    apiClient = null

    constructor(token, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, site)
    }

    async submitPaymentsDetails(data, customerId) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data
            }),
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
