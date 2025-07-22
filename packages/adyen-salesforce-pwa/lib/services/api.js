export class ApiClient {
    url = null
    token = null
    site = null

    constructor(url, token, site) {
        this.url = url
        this.token = token
        this.site = site
    }

    base(method, options) {
        const queryParams = {
            siteId: this.site.id,
            ...(options?.queryParams || {})
        }
        const path = options?.path ? `${options?.path}` : ''
        this.url = `${this.url}${path}?${new URLSearchParams(queryParams)}`
        return fetch(this.url, {
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
