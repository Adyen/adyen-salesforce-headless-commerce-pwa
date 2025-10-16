import {ApiClient} from './api'

export class AdyenEnvironmentService {
    baseUrl = '/api/adyen/environment'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async fetchEnvironment() {
        const res = await this.apiClient.get()
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
