import {Client, Config} from '@adyen/api-library'
import {PaymentsApi} from '@adyen/api-library/lib/src/services/checkout/paymentsApi'
import {getSiteConfig} from '../../utils/getConfig.mjs'

class AdyenCheckoutConfig {
    constructor() {
        const adyenConfig = getSiteConfig('adyen')
        const config = new Config()
        config.apiKey = adyenConfig.apiKey
        const client = new Client({config})
        client.setEnvironment(adyenConfig.environment)
        this.instance = new PaymentsApi(client)
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new AdyenCheckoutConfig()
        }
        return this.instance
    }
}

export default AdyenCheckoutConfig
