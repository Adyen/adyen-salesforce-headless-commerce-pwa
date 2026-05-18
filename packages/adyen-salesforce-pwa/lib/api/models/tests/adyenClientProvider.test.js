import AdyenClientProvider from '../adyenClientProvider.js'
import {AdyenError} from '../AdyenError'
import {ADYEN_ENVIRONMENT, ERROR_MESSAGE} from '../../../utils/constants.mjs'
import Client from '@adyen/api-library/lib/src/client.js'

const mockPaymentsApi = {name: 'PaymentsApi'}
const mockOrdersApi = {name: 'OrdersApi'}
const mockUtilityApi = {name: 'UtilityApi'}

const mockTerminalSync = jest.fn()

jest.mock('@adyen/api-library/lib/src/client.js', () => {
    return jest.fn().mockImplementation((config) => ({
        config: config
    }))
})

jest.mock('@adyen/api-library/lib/src/services/checkout/index.js', () => {
    return jest.fn().mockImplementation(() => ({
        PaymentsApi: mockPaymentsApi,
        OrdersApi: mockOrdersApi,
        UtilityApi: mockUtilityApi
    }))
})

jest.mock('@adyen/api-library/lib/src/services/terminalCloudAPI.js', () => {
    return jest.fn().mockImplementation(() => ({sync: mockTerminalSync}))
})

describe('AdyenClientProvider', () => {
    let mockAdyenContext

    beforeEach(() => {
        jest.clearAllMocks()
        mockAdyenContext = {
            adyenConfig: {
                apiKey: 'mock-api-key',
                environment: 'TEST'
            }
        }
    })

    it('should correctly instantiate and provide APIs for TEST environment', () => {
        const provider = new AdyenClientProvider(mockAdyenContext)

        expect(provider.getPaymentsApi()).toBe(mockPaymentsApi)
        expect(provider.getOrdersApi()).toBe(mockOrdersApi)

        expect(Client).toHaveBeenCalledWith({
            apiKey: 'mock-api-key',
            environment: ADYEN_ENVIRONMENT.TEST
        })
    })

    it('should throw AdyenError for missing live endpoint URL prefix in live environment', () => {
        mockAdyenContext.adyenConfig.environment = 'live'

        expect(() => new AdyenClientProvider(mockAdyenContext)).toThrow(
            new AdyenError(ERROR_MESSAGE.MISSING_LIVE_PREFIX, 400)
        )
    })

    it('should provide the UtilityApi', () => {
        const provider = new AdyenClientProvider(mockAdyenContext)
        expect(provider.getUtilityApi()).toBeDefined()
    })

    it('should correctly instantiate and provide APIs for LIVE environment', () => {
        mockAdyenContext.adyenConfig = {
            apiKey: 'live-api-key',
            environment: 'live-apse',
            liveEndpointUrlPrefix: 'prefix'
        }

        const provider = new AdyenClientProvider(mockAdyenContext)

        expect(provider.getPaymentsApi()).toBe(mockPaymentsApi)
        expect(provider.getOrdersApi()).toBe(mockOrdersApi)

        expect(Client).toHaveBeenCalledWith({
            apiKey: 'live-api-key',
            environment: ADYEN_ENVIRONMENT.LIVE,
            liveEndpointUrlPrefix: 'prefix'
        })
    })
})

describe('AdyenClientProvider - getTerminalClient', () => {
    let mockAdyenContext

    beforeEach(() => {
        jest.clearAllMocks()
        mockAdyenContext = {
            adyenConfig: {
                apiKey: 'mock-api-key',
                environment: 'TEST'
            }
        }
    })

    it('creates a TEST terminal client using apiKey', () => {
        const provider = new AdyenClientProvider(mockAdyenContext)
        provider.getTerminalClient()

        expect(Client).toHaveBeenCalledWith(
            expect.objectContaining({
                apiKey: 'mock-api-key',
                environment: ADYEN_ENVIRONMENT.TEST
            })
        )
    })

    it('uses terminalApiKey over apiKey when both are set', () => {
        mockAdyenContext.adyenConfig.terminalApiKey = 'terminal-key'
        const provider = new AdyenClientProvider(mockAdyenContext)
        provider.getTerminalClient()

        expect(Client).toHaveBeenCalledWith(expect.objectContaining({apiKey: 'terminal-key'}))
    })

    it('creates a LIVE terminal client with liveTerminalUrlPrefix', () => {
        mockAdyenContext.adyenConfig = {
            apiKey: 'api-key',
            environment: 'live',
            liveEndpointUrlPrefix: 'checkout-prefix',
            liveTerminalUrlPrefix: 'eu-prefix'
        }
        const provider = new AdyenClientProvider(mockAdyenContext)
        provider.getTerminalClient()

        expect(Client).toHaveBeenCalledWith(
            expect.objectContaining({
                environment: ADYEN_ENVIRONMENT.LIVE,
                endpoint: 'https://terminal-api-live-eu-prefix.adyen.com'
            })
        )
    })

    it('falls back to liveEndpointUrlPrefix when liveTerminalUrlPrefix is not set', () => {
        mockAdyenContext.adyenConfig = {
            apiKey: 'api-key',
            environment: 'live',
            liveEndpointUrlPrefix: 'eu-prefix'
        }
        const provider = new AdyenClientProvider(mockAdyenContext)
        provider.getTerminalClient()

        expect(Client).toHaveBeenCalledWith(
            expect.objectContaining({
                environment: ADYEN_ENVIRONMENT.LIVE,
                endpoint: 'https://terminal-api-live-eu-prefix.adyen.com'
            })
        )
    })
})
