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
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to fetch environment'}))
            throw new Error(
                errorData.message || `Fetch environment failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
