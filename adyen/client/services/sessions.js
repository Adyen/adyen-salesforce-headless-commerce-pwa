import {ApiClient} from './api'

export class SessionsService {
    baseUrl = '/api/adyen/sessions'
    apiClient = null

    constructor(token) {
        this.apiClient = new ApiClient(this.baseUrl, token)
    }

    async createSession(options) {
        const res = await this.apiClient.post(options)
        if (res.status >= 300) {
            throw new Error(res)
        } else {
            return await res.json()
        }
    }
}
