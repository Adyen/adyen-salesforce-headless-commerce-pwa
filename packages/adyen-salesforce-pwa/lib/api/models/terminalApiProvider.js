import TerminalCloudAPI from '@adyen/api-library/lib/src/services/terminalCloudAPI.js'
import Client from '@adyen/api-library/lib/src/client.js'
import {ADYEN_ENVIRONMENT, ERROR_MESSAGE} from '../../utils/constants.mjs'
import {AdyenError} from './AdyenError'

const LIVE_TERMINAL_URL_PATTERN = 'https://terminal-api-live-{prefix}.adyen.com'

/**
 * Provider class for creating and managing Adyen Terminal Cloud API clients.
 * Handles client configuration for both test and live environments.
 */
class TerminalApiProvider {
    /**
     * Creates a new TerminalApiProvider instance.
     * @param {object} adyenContext - The Adyen context object from res.locals.adyen.
     * @param {object} adyenContext.adyenConfig - The Adyen configuration object.
     * @param {string} adyenContext.adyenConfig.terminalApiKey - The Terminal API key. Falls back to apiKey if not set.
     * @param {string} adyenContext.adyenConfig.terminalEnvironment - The terminal environment ('TEST' or 'LIVE').
     * @param {string} [adyenContext.adyenConfig.liveTerminalUrlPrefix] - The live terminal URL prefix (required for LIVE).
     */
    constructor(adyenContext) {
        this.adyenContext = adyenContext
        this.terminalCloudApi = new TerminalCloudAPI(this.getClient())
    }

    /**
     * Creates and configures an Adyen API client for Terminal Cloud API.
     * @returns {Client} A configured Adyen API client instance.
     * @throws {AdyenError} If liveTerminalUrlPrefix is missing for LIVE environment.
     * @private
     */
    getClient() {
        const {adyenConfig} = this.adyenContext
        const apiKey = adyenConfig.terminalApiKey || adyenConfig.apiKey
        const isLive = adyenConfig.terminalEnvironment?.toUpperCase() === ADYEN_ENVIRONMENT.LIVE

        const config = {apiKey}

        if (isLive) {
            if (!adyenConfig.liveTerminalUrlPrefix) {
                throw new AdyenError(ERROR_MESSAGE.MISSING_LIVE_TERMINAL_PREFIX, 400)
            }
            config.environment = ADYEN_ENVIRONMENT.LIVE
            config.endpoint = LIVE_TERMINAL_URL_PATTERN.replace(
                '{prefix}',
                adyenConfig.liveTerminalUrlPrefix
            )
        } else {
            config.environment = ADYEN_ENVIRONMENT.TEST
        }

        return new Client(config)
    }

    /**
     * Sends a synchronous request to the Terminal Cloud API.
     * @param {object} terminalApiRequest - The TerminalApiRequest to send.
     * @returns {Promise<object>} A promise that resolves to a TerminalApiResponse.
     */
    async sync(terminalApiRequest) {
        return this.terminalCloudApi.sync(terminalApiRequest)
    }
}

export default TerminalApiProvider
