import {klarnaConfig} from '../klarna/config'
import {baseConfig} from '../helpers/baseConfig'

jest.mock('../helpers/baseConfig', () => ({
    baseConfig: jest.fn()
}))

describe('klarnaConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return the correct configuration object', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }

        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            someProp: 'value'
        }

        const expectedConfig = {
            ...mockedBaseConfigResult,
            showPayButton: true,
            useKlarnaWidget: true
        }

        const result = klarnaConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(result).toEqual(expectedConfig)
    })
})
