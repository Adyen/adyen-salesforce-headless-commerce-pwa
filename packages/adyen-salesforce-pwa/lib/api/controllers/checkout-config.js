import {Client, Config} from '@adyen/api-library'
import {PaymentsApi} from '@adyen/api-library/lib/src/services/checkout/paymentsApi'

class AdyenCheckoutConfig {
    constructor() {
        const config = new Config()
        config.apiKey = process.env.ADYEN_API_KEY
        const client = new Client({config})
        client.setEnvironment(process.env.ADYEN_ENVIRONMENT)
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
