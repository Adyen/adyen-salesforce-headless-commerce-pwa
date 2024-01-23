import {amazonPayConfig} from '../amazonpay/config' // Adjust the import path accordingly
import {baseConfig} from '../helpers/baseConfig'

jest.mock('../helpers/baseConfig', () => ({
    baseConfig: jest.fn()
}))

describe('amazonPayConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should call baseConfig with props and additional properties', () => {
        const props = {
            returnUrl: '/checkout/redirect'
        }
        const result = amazonPayConfig(props)

        expect(result).toEqual(
            expect.objectContaining({
                showPayButton: true,
                productType: 'PayAndShip',
                checkoutMode: 'ProcessOrder',
                onClick: expect.any(Function)
            })
        )
    })

    it('should call onBillingSubmit before resolving', async () => {
        const props = {
            beforeSubmit: [jest.fn()],
            returnUrl: '/checkout/redirect'
        }
        const result = amazonPayConfig(props)

        const resolve = jest.fn()
        const reject = jest.fn()

        await result.onClick(resolve, reject)

        expect(props.beforeSubmit[0]).toHaveBeenCalled()
        expect(resolve).toHaveBeenCalled()
        expect(reject).not.toHaveBeenCalled()
    })

    it('should return the correct configuration object', () => {
        const mockedBaseConfigResult = {
            someBaseConfigValue: 'mockedValue'
        }

        baseConfig.mockReturnValue(mockedBaseConfigResult)

        const props = {
            prop1: 'value1',
            prop2: 'value2',
            returnUrl: '/checkout/redirect'
        }

        const expectedConfig = {
            ...mockedBaseConfigResult,
            showPayButton: true,
            productType: 'PayAndShip',
            checkoutMode: 'ProcessOrder',
            onClick: expect.any(Function),
            returnUrl: '/checkout/redirect'
        }

        const result = amazonPayConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(result).toEqual(expectedConfig)
    })
})
