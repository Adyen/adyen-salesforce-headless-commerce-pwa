import {ApiClient} from './api'

export class TerminalApiService {
    baseUrl = '/api/adyen/terminal-api'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async fetchTerminals(storeId) {
        const res = await this.apiClient.get({
            path: '/terminals',
            queryParams: {storeId}
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Failed to fetch terminals'}))
            throw new Error(
                errorData.errorMessage || `Fetch terminals failed with status ${res.status}`
            )
        }
        return await res.json()
    }

    async createPayment({terminalId, serviceId}) {
        const res = await this.apiClient.post({
            path: '/payment',
            body: JSON.stringify({terminalId, ...(serviceId && {serviceId})})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Terminal payment failed'}))
            throw new Error(
                errorData.errorMessage || `Terminal payment failed with status ${res.status}`
            )
        }
        return await res.json()
    }

    async abortPayment({serviceId, terminalId}) {
        const res = await this.apiClient.post({
            path: '/abort',
            body: JSON.stringify({serviceId, terminalId})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Terminal abort failed'}))
            throw new Error(
                errorData.errorMessage || `Terminal abort failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
