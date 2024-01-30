import AdyenCheckoutConfig from '../checkout-config'

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
})
