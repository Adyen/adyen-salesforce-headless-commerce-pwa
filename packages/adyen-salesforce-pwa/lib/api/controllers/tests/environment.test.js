import getEnvironment from '../environment'
import {getSiteConfig} from '../../../utils/getConfig.mjs'

jest.mock('../../../utils/getConfig.mjs', () => ({
    getSiteConfig: jest.fn()
}))

describe('getEnvironment middleware', () => {
    let req, res, next

    beforeEach(() => {
        req = {}
        res = {
            locals: {}
        }
        next = jest.fn()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should set response locals with correct Adyen config', async () => {
        const mockAdyenConfig = {
            clientKey: 'mockClientKey',
            environment: 'mockEnvironment'
        }

        getSiteConfig.mockReturnValueOnce(mockAdyenConfig)
        await getEnvironment(req, res, next)

        expect(getSiteConfig).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            ADYEN_CLIENT_KEY: 'mockClientKey',
            ADYEN_ENVIRONMENT: 'mockEnvironment'
        })
        expect(next).toHaveBeenCalled()
    })
})
