import {paymentMethodsConfiguration} from '../paymentMethodsConfiguration'
import {baseConfig} from '../helpers/baseConfig'
import {klarnaConfig} from '../klarna/config'

jest.mock('../helpers/baseConfig', () => ({
    baseConfig: jest.fn()
}))
jest.mock('../klarna/config', () => ({
    klarnaConfig: jest.fn()
}))
jest.mock('../card/config', () => ({
    cardConfig: jest.fn()
}))
jest.mock('../paypal/config', () => ({
    paypalConfig: jest.fn()
}))
jest.mock('../applepay/config', () => ({
    applePayConfig: jest.fn()
}))
jest.mock('../amazonpay/config', () => ({
    amazonPayConfig: jest.fn()
}))

describe('paymentMethodsConfiguration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return the correct configuration for given payment methods', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }
        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const mockedKlarnaConfigResult = {
            someKlarnaConfigValue: 'klarnaMockedValue'
        }
        klarnaConfig.mockReturnValue(mockedKlarnaConfigResult)

        const props = {
            someProp: 'value'
        }

        const paymentMethods = [{type: 'card'}, {type: 'klarna'}]

        const result = paymentMethodsConfiguration({paymentMethods, ...props})

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(klarnaConfig).toHaveBeenCalledWith(props)

        expect(result.card).toBeUndefined()
        expect(result.klarna).toBeDefined()
    })

    it('should return default config if no payment methods available', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }
        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            someProp: 'value'
        }
        const paymentMethods = []

        const result = paymentMethodsConfiguration({paymentMethods, ...props})
        expect(result).toBe(mockedBaseConfigResult)
    })
})
