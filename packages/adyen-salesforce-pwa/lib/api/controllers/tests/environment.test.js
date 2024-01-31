import getEnvironment from '../environment'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'

jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs', () => ({
    getAdyenConfigForCurrentSite: jest.fn()
}))

describe('getEnvironment middleware', () => {
    let req, res, next

    beforeEach(() => {
        req = {
            query: {
                siteId: 'RefArch'
            }
        }
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

        getAdyenConfigForCurrentSite.mockReturnValueOnce(mockAdyenConfig)
        await getEnvironment(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            ADYEN_CLIENT_KEY: 'mockClientKey',
            ADYEN_ENVIRONMENT: 'mockEnvironment'
        })
        expect(next).toHaveBeenCalled()
    })
})
