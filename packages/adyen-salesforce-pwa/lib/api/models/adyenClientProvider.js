import {CheckoutAPI, Client} from '@adyen/api-library'
import {ADYEN_ENVIRONMENT, ADYEN_LIVE_REGIONS, ERROR_MESSAGE} from '../../utils/constants.mjs'
import {AdyenError} from './AdyenError'

class AdyenClientProvider {
    constructor(adyenContext) {
        this.adyenContext = adyenContext
        this.checkoutApi = new CheckoutAPI(this.getClient())
    }

    isLiveEnvironment(environment) {
        return Object.values(ADYEN_LIVE_REGIONS).includes(environment)
    }

    getClient() {
        const {adyenConfig} = this.adyenContext
        const config = {}
        config.apiKey = adyenConfig.apiKey

        const isLiveEnvironment = this.isLiveEnvironment(adyenConfig.environment)

        if (isLiveEnvironment) {
            if (!adyenConfig.liveEndpointUrlPrefix) {
                throw new AdyenError(ERROR_MESSAGE.MISSING_LIVE_PREFIX, 400)
            }
            config.environment = ADYEN_ENVIRONMENT.LIVE
            config.liveEndpointUrlPrefix = adyenConfig.liveEndpointUrlPrefix
        } else {
            config.environment = ADYEN_ENVIRONMENT.TEST
        }

        return new Client(config)
    }

    getPaymentsApi() {
        return this.checkoutApi.PaymentsApi
    }

    getOrdersApi() {
        return this.checkoutApi.OrdersApi
    }
}

export default AdyenClientProvider