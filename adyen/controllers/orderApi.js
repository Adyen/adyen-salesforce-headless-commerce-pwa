export class OrderApiClient {
    tokenUrl =
        'https://account.demandware.com/dwsso/oauth2/access_token?grant_type=client_credentials'

    async getAdminAuthToken() {
        const base64data = Buffer.from(
            `${process.env.COMMERCE_API_CLIENT_ID_PRIVATE}:${process.env.COMMERCE_API_CLIENT_SECRET}`
        ).toString('base64')
        const token = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                authorization: `Basic ${base64data}`
            },
            body: new URLSearchParams({
                scope: `SALESFORCE_COMMERCE_API:${process.env.SFCC_REALM_ID}_${process.env.SFCC_INSTANCE_ID} ${process.env.SFCC_OAUTH_SCOPES}`
            })
        })

        return token.json()
    }

    async base(method, path, options) {
        const token = await this.getAdminAuthToken()
        const baseUrl = `https://${process.env.COMMERCE_API_SHORT_CODE}.api.commercecloud.salesforce.com/checkout/orders/v1/organizations/${process.env.COMMERCE_API_ORG_ID}/orders/${path}?siteId=${process.env.COMMERCE_API_SITE_ID}`

        return fetch(baseUrl, {
            method: method,
            body: options?.body || null,
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${token.access_token}`,
                ...options?.headers
            }
        })
    }

    async getOrder(orderNo) {
        const response = await this.base('get', orderNo)
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return await response.json()
    }

    async updateOrderStatus(orderNo, status) {
        const response = await this.base('put', `${orderNo}/status`, {
            body: JSON.stringify({status: status})
        })
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return response
    }

    async updateOrderPaymentStatus(orderNo, status) {
        const response = await this.base('put', `${orderNo}/payment-status`, {
            body: JSON.stringify({status: status})
        })
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return response
    }

    async updateOrderExportStatus(orderNo, status) {
        const response = await this.base('put', `${orderNo}/export-status`, {
            body: JSON.stringify({status: status})
        })
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return response
    }

    async updateOrderConfirmationStatus(orderNo, status) {
        const response = await this.base('put', `${orderNo}/confirmation-status`, {
            body: JSON.stringify({status: status})
        })
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return response
    }

    async updateOrderPaymentTransaction(orderNo, paymentInstrumentId, pspReference) {
        const response = await this.base(
            'patch',
            `${orderNo}/payment-instruments/${paymentInstrumentId}/transaction`,
            {
                body: JSON.stringify({
                    c_externalReferenceCode: pspReference
                })
            }
        )
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`${response.status} ${response.statusText}`, {
                cause: error
            })
        }
        return response
    }
}
