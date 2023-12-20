import {amazonPayConfig} from '../amazonpay/config' // Adjust the import path accordingly
import {baseConfig} from '../helpers/baseConfig'

jest.mock('../helpers/baseConfig', () => ({
    baseConfig: jest.fn()
}))

describe('amazonPayConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return the correct configuration object', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }

        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            prop1: 'value1',
            prop2: 'value2'
        }

        const expectedConfig = {
            ...mockedBaseConfigResult,
            showPayButton: true,
            productType: 'PayAndShip',
            checkoutMode: 'ProcessOrder'
        }

        const result = amazonPayConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(result).toEqual(expectedConfig)
    })
})
