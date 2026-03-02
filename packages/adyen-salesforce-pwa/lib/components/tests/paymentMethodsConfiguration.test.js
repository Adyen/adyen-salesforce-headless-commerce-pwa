import {paymentMethodsConfiguration} from '../paymentMethodsConfiguration'
import {baseConfig} from '../helpers/baseConfig'
import {klarnaConfig} from '../klarna/config'
import {cardConfig} from '../card/config'

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
jest.mock('../giftcard/config', () => ({
    giftcardConfig: jest.fn()
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
            token: 'mockToken',
            site: {
                id: 'mockSiteId'
            }
        }

        const paymentMethods = [{type: 'card'}, {type: 'klarna'}]

        const result = paymentMethodsConfiguration({paymentMethods, ...props})

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(klarnaConfig).toHaveBeenCalledWith(props)

        expect(result.card).toBeUndefined()
        expect(result.klarna).toBeDefined()
    })

    it('should map scheme type to card config', () => {
        const mockedBaseConfigResult = {base: true}
        const mockedCardConfig = {card: true}
        baseConfig.mockReturnValue(mockedBaseConfigResult)
        cardConfig.mockReturnValue(mockedCardConfig)

        const paymentMethods = [{type: 'scheme'}]
        const result = paymentMethodsConfiguration({paymentMethods, token: 'tok'})
        expect(result.card).toEqual(mockedCardConfig)
    })

    it('should fall back to default config for unknown payment method types', () => {
        const mockedBaseConfigResult = {base: true}
        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const paymentMethods = [{type: 'unknownMethod'}]
        const result = paymentMethodsConfiguration({paymentMethods, token: 'tok'})
        expect(result.unknownMethod).toEqual(mockedBaseConfigResult)
    })

    it('should merge additionalPaymentMethodsConfiguration when provided', () => {
        const mockedBaseConfigResult = {base: true}
        baseConfig.mockReturnValue(mockedBaseConfigResult)
        klarnaConfig.mockReturnValue({klarna: true})

        const paymentMethods = [{type: 'klarna'}]
        const additionalPaymentMethodsConfiguration = {klarna: {extra: 'value'}}
        const result = paymentMethodsConfiguration({
            paymentMethods,
            additionalPaymentMethodsConfiguration,
            token: 'tok'
        })
        expect(result.klarna).toEqual({klarna: true, extra: 'value'})
    })

    it('should not merge additional config when type has no additional config', () => {
        const mockedBaseConfigResult = {base: true}
        baseConfig.mockReturnValue(mockedBaseConfigResult)
        klarnaConfig.mockReturnValue({klarna: true})

        const paymentMethods = [{type: 'klarna'}]
        const additionalPaymentMethodsConfiguration = {card: {extra: 'value'}}
        const result = paymentMethodsConfiguration({
            paymentMethods,
            additionalPaymentMethodsConfiguration,
            token: 'tok'
        })
        expect(result.klarna).toEqual({klarna: true})
    })

    it('should return default config when paymentMethods is undefined', () => {
        const mockedBaseConfigResult = {base: true}
        baseConfig.mockReturnValue(mockedBaseConfigResult)
        const result = paymentMethodsConfiguration({token: 'tok'})
        expect(result).toEqual(mockedBaseConfigResult)
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
