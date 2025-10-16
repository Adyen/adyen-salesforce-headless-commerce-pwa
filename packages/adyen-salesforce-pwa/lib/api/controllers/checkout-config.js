import {CheckoutAPI, Client} from '@adyen/api-library'
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
        const config = {}
        config.apiKey = adyenConfig.apiKey

        const isLiveEnvironment = this.isLiveEnvironment(adyenConfig.environment)

        if (isLiveEnvironment) {
            if (!adyenConfig.liveEndpointUrlPrefix) {
                throw new AdyenError(errorMessages.MISSING_LIVE_PREFIX, 400)
            }
            config.environment = ADYEN_ENVIRONMENT.LIVE
            config.liveEndpointUrlPrefix = adyenConfig.liveEndpointUrlPrefix
        } else {
            config.environment = ADYEN_ENVIRONMENT.TEST
        }

        return new Client(config)
    }

    static getInstance(siteId) {
        if (!this.instance) {
            const adyenCheckoutConfig = new AdyenCheckoutConfig(siteId)
            const client = adyenCheckoutConfig.getClient();
            const checkoutApi = new CheckoutAPI(client)
            this.instance = checkoutApi.PaymentsApi
        }
        return this.instance
    }

    static getOrdersApiInstance(siteId) {
        if (!this.ordersApiInstance) {
            const adyenCheckoutConfig = new AdyenCheckoutConfig(siteId)
            const client = adyenCheckoutConfig.getClient();
            const checkoutApi = new CheckoutAPI(client)
            this.ordersApiInstance = checkoutApi.OrdersApi
        }
        return this.ordersApiInstance
    }
}

export default AdyenCheckoutConfig
