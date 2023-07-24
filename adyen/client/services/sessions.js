import {ApiClient} from './api'

export class SessionsService {
    baseUrl = '/api/adyen/sessions'
    apiClient = null

    constructor(token) {
        this.apiClient = new ApiClient(this.baseUrl, token)
    }

    async createSession(customerId) {
        const res = await this.apiClient.post({
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
