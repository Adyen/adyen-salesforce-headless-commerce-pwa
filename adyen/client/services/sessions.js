import API_URLS from '../../utils/apiUrls'
import {ApiClient} from './api'

export class SessionsService {
    apiClient = null

    constructor(token) {
        this.apiClient = new ApiClient(API_URLS.SESSIONS, token)
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
