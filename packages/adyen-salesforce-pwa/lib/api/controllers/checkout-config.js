import {Client, Config} from '@adyen/api-library'
import {PaymentsApi} from '@adyen/api-library/lib/src/services/checkout/paymentsApi'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {ADYEN_LIVE_REGIONS, ADYEN_ENVIRONMENT} from '../../utils/constants.mjs'
import {AdyenError} from '../models/AdyenError'

const errorMessages = {
    MISSING_LIVE_PREFIX: 'missing live prefix'
}

class AdyenCheckoutConfig {
    constructor(siteId) {
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
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

        this.instance = new PaymentsApi(client)
    }

    isLiveEnvironment(environment) {
        return Object.values(ADYEN_LIVE_REGIONS).includes(environment)
    }

    static getInstance(siteId) {
        if (!this.instance) {
            this.instance = new AdyenCheckoutConfig(siteId)
        }
        return this.instance
    }
}

export default AdyenCheckoutConfig
