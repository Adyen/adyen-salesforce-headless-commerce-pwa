export class ApiClient {
    static base(method, url, token, options) {
        return fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${token}`,
                ...options.headers
            }
        })
    }

    static get(url, token, options) {
        return this.base('get', url, token, options)
    }

    static post(url, token, options) {
        return this.base('post', url, token, options)
    }
}
