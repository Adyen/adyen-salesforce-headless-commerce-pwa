import AdyenCheckoutConfig from '../checkout-config'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import {AdyenError} from '../../models/AdyenError'

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => {
    return {
        getConfig: jest.fn().mockImplementation(() => {
            return {
                app: {
                    sites: [
                        {
                            id: 'RefArch'
                        }
                    ],
                    commerceAPI: {
                        parameters: {
                            siteId: 'RefArch'
                        }
                    }
                }
            }
        })
    }
})

jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs', () => ({
    getAdyenConfigForCurrentSite: jest.fn(() => ({
        apiKey: 'mock-api-key',
        environment: 'TEST'
    }))
}))

jest.mock('@adyen/api-library', () => ({
    Client: jest.fn().mockImplementation(() => ({
        setEnvironment: jest.fn(),
        config: {
            environment: 'TEST'
        }
    })),
    Config: jest.fn().mockImplementation(() => ({
        apiKey: '',
        environment: 'TEST'
    })),
    PaymentsApi: jest.fn().mockImplementation(() => ({
        setEnvironment: jest.fn()
    }))
}))

describe('AdyenCheckoutConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return the same instance of AdyenCheckoutConfig when calling getInstance multiple times', () => {
        const instance1 = AdyenCheckoutConfig.getInstance()
        const instance2 = AdyenCheckoutConfig.getInstance()

        expect(instance1).toBe(instance2)
    })

    it('should throw AdyenError for missing live endpoint URL prefix in live environment', () => {
        getAdyenConfigForCurrentSite.mockReturnValue({
            environment: 'live',
            apiKey: 'live-api-key'
        })
        const adyenCheckoutConfig = new AdyenCheckoutConfig('siteId')
        expect(() => adyenCheckoutConfig.createInstance()).toThrow(AdyenError)
    })

    it('should return if its live environment', () => {
        getAdyenConfigForCurrentSite.mockReturnValue({
            environment: 'live',
            liveEndpointUrlPrefix: 'prefix'
        })
        const config = getAdyenConfigForCurrentSite('siteId')
        const adyenCheckoutConfig = new AdyenCheckoutConfig('siteId')
        expect(adyenCheckoutConfig.isLiveEnvironment(config.environment)).toBe(true)
    })
})
