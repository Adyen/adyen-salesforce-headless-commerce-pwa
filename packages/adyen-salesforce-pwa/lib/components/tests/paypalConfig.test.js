import {paypalConfig} from '../paypal/config'
import {baseConfig} from '../helpers/baseConfig'

jest.mock('../helpers/baseConfig', () => ({
    baseConfig: jest.fn()
}))

describe('paypalConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return the correct configuration object', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }

        // Mock the return value of baseConfig function
        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            someProp: 'value'
        }

        const expectedConfig = {
            ...mockedBaseConfigResult,
            showPayButton: true
        }

        const result = paypalConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props) // Verify if baseConfig was called with props
        expect(result).toEqual(expectedConfig) // Verify if the returned object matches the expected configuration
    })
})
