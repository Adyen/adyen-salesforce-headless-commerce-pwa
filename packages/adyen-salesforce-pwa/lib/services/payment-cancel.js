import {ApiClient} from './api'

export class PaymentCancelService {
    baseUrl = '/api/adyen/payment'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async paymentCancel(orderNo) {
        const res = await this.apiClient.post({
            path: '/cancel',
            body: JSON.stringify({
                orderNo
            })
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Payment cancellation failed'}))
            throw new Error(errorData.message || `Payment cancel failed with status ${res.status}`)
        }
        return await res.json()
    }
}
