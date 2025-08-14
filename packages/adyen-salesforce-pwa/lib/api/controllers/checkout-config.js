import {Client, Config} from '@adyen/api-library'
import {PaymentsApi} from '@adyen/api-library/lib/src/services/checkout/paymentsApi'
import {OrdersApi} from '@adyen/api-library/lib/src/services/checkout/ordersApi'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {ADYEN_ENVIRONMENT, ADYEN_LIVE_REGIONS} from '../../utils/constants.mjs'
import {AdyenError} from '../models/AdyenError'

const errorMessages = {
    MISSING_LIVE_PREFIX: 'missing live prefix'
}

class AdyenCheckoutConfig {
    constructor(siteId) {
        this.siteId = siteId
    }

    isLiveEnvironment(environment) {
        return Object.values(ADYEN_LIVE_REGIONS).includes(environment)
    }

    getClient() {
        const adyenConfig = getAdyenConfigForCurrentSite(this.siteId)
        const config = new Config()
        config.apiKey = adyenConfig.apiKey
        const client = new Client({config})

        const isLiveEnvironment = this.isLiveEnvironment(adyenConfig.environment)

        if (isLiveEnvironment) {
            if (!adyenConfig.liveEndpointUrlPrefix) {
                throw new AdyenError(errorMessages.MISSING_LIVE_PREFIX, 400)
            }
            client.setEnvironment(ADYEN_ENVIRONMENT.LIVE, adyenConfig.liveEndpointUrlPrefix)
        } else {
            client.setEnvironment(ADYEN_ENVIRONMENT.TEST)
        }

        return client
    }

    static getInstance(siteId) {
        if (!this.instance) {
            const adyenCheckoutConfig = new AdyenCheckoutConfig(siteId)
            const client = adyenCheckoutConfig.getClient();
            this.instance = new PaymentsApi(client)
        }
        return this.instance
    }

    static getOrdersApiInstance(siteId) {
        if (!this.ordersApiInstance) {
            const adyenCheckoutConfig = new AdyenCheckoutConfig(siteId)
            const client = adyenCheckoutConfig.getClient();
            this.ordersApiInstance = new OrdersApi(client)
        }
        return this.ordersApiInstance
    }
}

export default AdyenCheckoutConfig
