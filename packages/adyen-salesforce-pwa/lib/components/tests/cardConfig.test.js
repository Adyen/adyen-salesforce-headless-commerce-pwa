import {cardConfig} from '../card/config'
import {baseConfig} from '../helpers/baseConfig'

jest.mock('../helpers/baseConfig', () => ({
    baseConfig: jest.fn()
}))

describe('cardConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return the correct configuration object when customer is registered', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }

        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            isCustomerRegistered: true
        }

        const expectedConfig = {
            ...mockedBaseConfigResult,
            _disableClickToPay: true,
            showPayButton: true,
            hasHolderName: true,
            holderNameRequired: true,
            billingAddressRequired: false,
            enableStoreDetails: true
        }

        const result = cardConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(result).toEqual(expectedConfig)
    })

    it('should return the correct configuration object when customer is not registered', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }

        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            isCustomerRegistered: false
        }

        const expectedConfig = {
            ...mockedBaseConfigResult,
            _disableClickToPay: true,
            showPayButton: true,
            hasHolderName: true,
            holderNameRequired: true,
            billingAddressRequired: false,
            enableStoreDetails: false
        }

        const result = cardConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(result).toEqual(expectedConfig)
    })
})
