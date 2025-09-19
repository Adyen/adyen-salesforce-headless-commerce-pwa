export class ApiClient {
    baseUrl = null
    token = null
    site = null

    constructor(url, token, site) {
        if (!url) {
            throw new Error('ApiClient constructor: url is required')
        }
        if (!token) {
            throw new Error('ApiClient constructor: token is required')
        }
        if (!site || !site.id) {
            throw new Error('ApiClient constructor: site object with id property is required')
        }
        this.baseUrl = url
        this.token = token
        this.site = site
    }

    base(method, options) {
        const queryParams = {
            siteId: this.site.id,
            ...(options?.queryParams || {})
        }
        const path = options?.path ? `${options?.path}` : ''
        const url = `${this.baseUrl}${path}?${new URLSearchParams(queryParams)}`
        return fetch(url, {
            method: method,
            body: options?.body || null,
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${this.token}`,
                ...options?.headers
            }
        })
    }

    get(options) {
        return this.base('get', options)
    }

    post(options) {
        return this.base('post', options)
    }
}
