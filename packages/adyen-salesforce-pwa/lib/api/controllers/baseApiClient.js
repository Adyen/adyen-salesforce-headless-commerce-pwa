import fetch from 'node-fetch'

/**
 * A base class for creating Salesforce Commerce API clients.
 * It handles admin token authentication, caching, and provides a protected method for making API calls.
 */
export class BaseApiClient {
    #tokenUrl =
        'https://account.demandware.com/dwsso/oauth2/access_token?grant_type=client_credentials'
    #baseUrl
    #accessToken = null
    #tokenExpiry = 0

    /**
     * @constructor
     * @param {string} baseUrl - The base URL for the specific Commerce API.
     * @throws {Error} If the baseUrl is not provided.
     */
    constructor(baseUrl) {
        if (!baseUrl) {
            throw new Error('baseUrl is required to instantiate an API client.')
        }
        this.#baseUrl = baseUrl
    }

    /**
     * Fetches a new admin token or returns a cached one if it's still valid.
     * @returns {Promise<string>} The admin access token.
     * @private
     */
    async #getAdminAuthToken() {
        // Return cached token if it's still valid (with a 60-second buffer)
        if (this.#accessToken && Date.now() < this.#tokenExpiry) {
            return this.#accessToken
        }

        const base64data = Buffer.from(
            `${process.env.COMMERCE_API_CLIENT_ID_PRIVATE}:${process.env.COMMERCE_API_CLIENT_SECRET}`
        ).toString('base64')

        const scope = `SALESFORCE_COMMERCE_API:${process.env.SFCC_REALM_ID}_${process.env.SFCC_INSTANCE_ID} ${process.env.SFCC_OAUTH_SCOPES}`

        const tokenResponse = await fetch(this.#tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                authorization: `Basic ${base64data}`
            },
            body: new URLSearchParams({scope})
        })

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text()
            throw new Error(`${tokenResponse.status} ${tokenResponse.statusText}`, {
                cause: error
            })
        }

        const tokenData = await tokenResponse.json()
        this.#accessToken = tokenData.access_token
        // expires_in is in seconds. We subtract 60 seconds to create a safety buffer.
        this.#tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000

        return this.#accessToken
    }

    /**
     * A protected base method to handle all API calls, including auth and error handling.
     * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
     * @param {string} path - The API endpoint path.
     * @param {object} [options] - Optional request options.
     * @param {string} [options.body] - The request body.
     * @param {object} [options.headers] - Additional request headers.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     * @protected
     */
    async _callAdminApi(method, path, options) {
        const token = await this.#getAdminAuthToken()
        const url = `${this.#baseUrl}/${path}?siteId=${process.env.COMMERCE_API_SITE_ID}`

        const response = await fetch(url, {
            method: method,
            body: options?.body || null,
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${token}`,
                ...options?.headers
            }
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return response
    }

    /**
     * A protected base method to handle all Shopper API calls, including auth and error handling.
     * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
     * @param {string} path - The API endpoint path.
     * @param {object} [options] - Optional request options.
     * @param {string} [options.body] - The request body.
     * @param {object} [options.headers] - Additional request headers.
     * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
     * @protected
     */
    async _callShopperApi(method, path, options) {
        const url = `${this.#baseUrl}/${path}?siteId=${process.env.COMMERCE_API_SITE_ID}`

        const response = await fetch(url, {
            method: method,
            body: options?.body || null,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return response
    }
}