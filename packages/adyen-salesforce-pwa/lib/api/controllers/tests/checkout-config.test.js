import AdyenCheckoutConfig from '../checkout-config'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import {AdyenError} from '../../models/AdyenError'

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => ({
    getConfig: jest.fn().mockReturnValue({
        app: {
            sites: [{id: 'RefArch'}],
            commerceAPI: {parameters: {siteId: 'RefArch'}}
        }
    })
}))

jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs', () => ({
    getAdyenConfigForCurrentSite: jest.fn(() => ({
        apiKey: 'mock-api-key',
        environment: 'TEST'
    }))
}))
const mockPaymentsApi = jest.fn()
const mockOrdersApi = jest.fn()
jest.mock('@adyen/api-library', () => ({
    Client: jest.fn().mockImplementation(() => ({
        setEnvironment: jest.fn(),
        config: {environment: 'TEST'}
    })),
    CheckoutAPI: jest.fn().mockImplementation(() => ({
        PaymentsApi: mockPaymentsApi,
        OrdersApi: mockOrdersApi
    }))
}))

describe('AdyenCheckoutConfig', () => {
    beforeEach(() => {
        // Reset the singleton instance before each test
        AdyenCheckoutConfig.instances = {}
        jest.clearAllMocks()
    })

    it('should throw AdyenError for missing live endpoint URL prefix in live environment', () => {
        getAdyenConfigForCurrentSite.mockReturnValue({
            environment: 'live',
            apiKey: 'live-api-key'
        })
        expect(() => AdyenCheckoutConfig.getInstance('RefArch')).toThrow(AdyenError)
    })

    it('should return if its live environment', () => {
        getAdyenConfigForCurrentSite.mockReturnValue({
            environment: 'live',
            liveEndpointUrlPrefix: 'prefix'
        })
        const config = getAdyenConfigForCurrentSite('RefArch')
        const adyenCheckoutConfig = AdyenCheckoutConfig.getInstance('RefArch')
        expect(adyenCheckoutConfig).toBe(mockPaymentsApi)
    })
})
