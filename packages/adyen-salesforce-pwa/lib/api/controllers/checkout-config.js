import {Client, Config} from '@adyen/api-library'
import {PaymentsApi} from '@adyen/api-library/lib/src/services/checkout/paymentsApi'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {ADYEN_ENVIRONMENTS} from '../../utils/constants.mjs'
import {AdyenError} from '../models/AdyenError'
import Logger from './logger'

const errorMessages = {
    MISSING_LIVE_PREFIX: 'missing live prefix'
}

class AdyenCheckoutConfig {
    constructor(siteId) {
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        const isLiveEnvironment = this.isLiveEnvironment(adyenConfig.environment)
        Logger.info('isLiveEnvironment', isLiveEnvironment)

        const config = new Config()
        if (isLiveEnvironment) {
            if (!adyenConfig.liveEndpointUrlPrefix) {
                Logger.info('NO LIVE PREFIX')
                throw new AdyenError(errorMessages.MISSING_LIVE_PREFIX, 400)
            }
            Logger.info('HAS LIVE PREFIX')
            config.liveEndpointUrlPrefix = adyenConfig.liveEndpointUrlPrefix
        }
        config.apiKey = adyenConfig.apiKey

        const client = new Client({config})
        client.setEnvironment(adyenConfig.environment)
        this.instance = new PaymentsApi(client)
    }

    isLiveEnvironment(environment) {
        return Object.values(ADYEN_ENVIRONMENTS).includes(environment)
    }

    static getInstance(siteId) {
        if (!this.instance) {
            this.instance = new AdyenCheckoutConfig(siteId)
        }
        return this.instance
    }
}

export default AdyenCheckoutConfig
