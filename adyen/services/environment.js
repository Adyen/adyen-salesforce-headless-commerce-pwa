import {ApiClient} from './api'

export class AdyenEnvironmentService {
    baseUrl = '/api/adyen/environment'
    apiClient = null

    constructor(token) {
        this.apiClient = new ApiClient(this.baseUrl, token)
    }

    async fetchEnvironment() {
        const res = await this.apiClient.post()
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
