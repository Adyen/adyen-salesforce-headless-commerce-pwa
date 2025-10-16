import AdyenClientProvider from '../adyenClientProvider.js'
import {AdyenError} from '../AdyenError'
import {ADYEN_ENVIRONMENT, ERROR_MESSAGE} from '../../../utils/constants.mjs'
import {Client, CheckoutAPI} from '@adyen/api-library'

const mockPaymentsApi = jest.fn()
const mockOrdersApi = jest.fn()

jest.mock('@adyen/api-library', () => {
    // A more realistic mock for the Client that stores its config
    const mockClient = jest.fn().mockImplementation((config) => ({
        config: config
    }))
    const mockCheckoutAPI = jest.fn(() => ({PaymentsApi: mockPaymentsApi, OrdersApi: mockOrdersApi}))
    return {Client: mockClient, CheckoutAPI: mockCheckoutAPI}
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
