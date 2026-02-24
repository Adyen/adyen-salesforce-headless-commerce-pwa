import {ApiClient} from './api'

export class AdyenDonationsService {
    baseUrl = '/api/adyen'
    apiClient = null

    constructor(token, customerId, basketId, site) {
        this.apiClient = new ApiClient(this.baseUrl, token, customerId, basketId, site)
    }

    async fetchDonationCampaigns(orderNo, locale) {
        const res = await this.apiClient.get({
            path: '/donationCampaigns',
            queryParams: {orderNo, locale: locale?.id}
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Failed to fetch donation campaigns'}))
            throw new Error(
                errorData.message || `Fetch donation campaigns failed with status ${res.status}`
            )
        }
        return await res.json()
    }

    async submitDonation(data) {
        const res = await this.apiClient.post({
            path: '/donations',
            body: JSON.stringify({data})
        })
        if (res.status >= 300) {
            const errorData = await res
                .json()
                .catch(() => ({message: 'Donation submission failed'}))
            throw new Error(errorData.message || `Donation failed with status ${res.status}`)
        }
        return await res.json()
    }
}
