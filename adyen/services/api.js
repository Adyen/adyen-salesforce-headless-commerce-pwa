export class ApiClient {
    url = null
    token = null

    constructor(url, token) {
        this.url = url
        this.token = token
    }

    base(method, options) {
        return fetch(this.url, {
            method: method,
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
