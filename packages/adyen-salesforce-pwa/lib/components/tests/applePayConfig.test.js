import {applePayConfig} from '../applepay/config'
import {baseConfig} from '../helpers/baseConfig'

jest.mock('../helpers/baseConfig', () => ({
    baseConfig: jest.fn()
}))

describe('applePayConfig', () => {
    beforeEach(() => {
        // Reset mock function calls before each test
        jest.clearAllMocks()
    })

    it('should return the correct configuration object', () => {
        const mockedBaseConfigResult = {
            /* Define the mocked return value of baseConfig function here */
            // For example:
            someBaseConfigValue: 'mockedValue'
        }

        // Mock the return value of baseConfig function
        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            // Define props here if needed for the test
            // For example:
            prop1: 'value1',
            prop2: 'value2'
        }

        const expectedConfig = {
            ...mockedBaseConfigResult,
            showPayButton: true
        }

        const result = applePayConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props) // Verify if baseConfig was called with props
        expect(result).toEqual(expectedConfig) // Verify if the returned object matches the expected configuration
    })
})
