import CheckoutAPI from '@adyen/api-library/lib/src/services/checkout/index.js'
import Client from '@adyen/api-library/lib/src/client.js'
import {ADYEN_ENVIRONMENT, ADYEN_LIVE_REGIONS, ERROR_MESSAGE} from '../../utils/constants.mjs'
import {AdyenError} from './AdyenError'

/**
 * Provider class for creating and managing Adyen API clients.
 * Handles client configuration for both test and live environments
 * and provides access to various Adyen Checkout API services.
 */
class AdyenClientProvider {
    /**
     * Creates a new AdyenClientProvider instance.
     * @param {object} adyenContext - The Adyen context object from res.locals.adyen.
     * @param {object} adyenContext.adyenConfig - The Adyen configuration object.
     * @param {string} adyenContext.adyenConfig.apiKey - The Adyen API key.
     * @param {string} adyenContext.adyenConfig.environment - The environment (test or live region).
     * @param {string} [adyenContext.adyenConfig.liveEndpointUrlPrefix] - The live endpoint URL prefix (required for live environments).
     */
    constructor(adyenContext) {
        this.adyenContext = adyenContext
        this.checkoutApi = new CheckoutAPI(this.getClient())
    }

    /**
     * Checks if the given environment is a live environment.
     * @param {string} environment - The environment string to check.
     * @returns {boolean} True if the environment is a live region, false otherwise.
     */
    isLiveEnvironment(environment) {
        return Object.values(ADYEN_LIVE_REGIONS).includes(environment)
    }

    /**
     * Creates and configures an Adyen API client based on the environment.
     * @returns {Client} A configured Adyen API client instance.
     * @throws {AdyenError} Throws an error if liveEndpointUrlPrefix is missing for live environments.
     * @private
     */
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

    /**
     * Gets the Adyen Payments API instance.
     * Used for making payment requests, handling payment details, and payment sessions.
     * @returns {object} The Adyen PaymentsApi instance.
     */
    getPaymentsApi() {
        return this.checkoutApi.PaymentsApi
    }

    /**
     * Gets the Adyen Orders API instance.
     * Used for creating, canceling, and managing orders for gift cards and partial payments.
     * @returns {object} The Adyen OrdersApi instance.
     */
    getOrdersApi() {
        return this.checkoutApi.OrdersApi
    }

    /**
     * Gets the Adyen Utility API instance.
     * Used for utility operations like updating PayPal orders.
     * @returns {object} The Adyen UtilityApi instance.
     */
    getUtilityApi() {
        return this.checkoutApi.UtilityApi
    }
}

export default AdyenClientProvider
