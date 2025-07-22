import {ApiClient} from './api'

export class AdyenOrderService {
    baseUrl = '/api/adyen/order'
    apiClient = null

    constructor(token, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, site)
    }

    async orderCancel(orderNo, customerId) {
        const res = await this.apiClient.post({
            path: '/cancel',
            body: JSON.stringify({
                orderNo
            }),
            headers: {
                customerid: customerId,
            }
        })
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
