import {ApiClient} from './api'

export class PaymentCancelExpressService {
    baseUrl = '/api/adyen/payment'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async paymentCancelExpress() {
        const res = await this.apiClient.post({
            path: '/cancel/express',
            body: JSON.stringify({})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Express payment cancellation failed'}))
            throw new Error(
                errorData.message || `Express payment cancel failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
