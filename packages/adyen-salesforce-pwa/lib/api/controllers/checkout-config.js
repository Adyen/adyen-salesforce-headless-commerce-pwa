import {Client, Config} from '@adyen/api-library'
import {PaymentsApi} from '@adyen/api-library/lib/src/services/checkout/paymentsApi'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'

class AdyenCheckoutConfig {
    constructor(siteId) {
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        const config = new Config()
        config.apiKey = adyenConfig.apiKey
        const client = new Client({config})
        client.setEnvironment(adyenConfig.environment)
        this.instance = new PaymentsApi(client)
    }

    static getInstance(siteId) {
        if (!this.instance) {
            this.instance = new AdyenCheckoutConfig(siteId)
        }
        return this.instance
    }
}

export default AdyenCheckoutConfig
