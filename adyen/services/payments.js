import {ApiClient} from './api'

export class AdyenPaymentsService {
    baseUrl = '/api/adyen/payments'
    apiClient = null

    constructor(token, order, adyenStateData) {
        this.apiClient = new ApiClient(this.baseUrl, token)
    }

    async submitPayment(order, adyenStateData, customerId) {
        const res = await this.apiClient.post({
            body: JSON.stringify({
                data: adyenStateData
            }),
            headers: {
                customerid: customerId,
                orderNo: order.orderNo
            }
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
