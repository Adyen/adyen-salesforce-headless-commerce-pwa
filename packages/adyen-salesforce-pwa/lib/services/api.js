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
        this.url = `${this.url}?${new URLSearchParams(queryParams)}`
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

    put(options) {
        return this.base('put', options)
    }
}
