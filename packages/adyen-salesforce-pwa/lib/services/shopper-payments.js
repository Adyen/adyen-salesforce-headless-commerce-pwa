import {ApiClient} from './api'

export class AdyenShopperPaymentsService {
    baseUrl = '/api/adyen/shopper-payments'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async fetchPaymentConfiguration(locale) {
        const res = await this.apiClient.get({
            queryParams: {locale: locale.id}
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({errorMessage: 'Failed to fetch shopper payments configuration'}))
            throw new Error(
                errorData.errorMessage ||
                    `Fetch shopper payments configuration failed with status ${res.status}`
            )
        }
        return await res.json()
    }
}
