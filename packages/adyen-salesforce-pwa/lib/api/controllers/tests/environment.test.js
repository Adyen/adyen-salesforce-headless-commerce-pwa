import getEnvironment from '../environment'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

jest.mock('../../models/logger')
describe('getEnvironment middleware', () => {
    let req, res, next

    beforeEach(() => {
        req = {
            query: {
                siteId: 'RefArch'
            }
        }
        res = {
            locals: {
                adyen: {
                    adyenConfig: {
                        clientKey: 'mockClientKey',
                        environment: 'mockEnvironment'
                    },
                    siteId: 'RefArch',
                }
            }
        }
        next = jest.fn()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should set response locals with correct Adyen config', async () => {
        await getEnvironment(req, res, next)

        expect(res.locals.response).toEqual({
            ADYEN_CLIENT_KEY: 'mockClientKey',
            ADYEN_ENVIRONMENT: 'mockEnvironment'
        })
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('should call next with an error if getAdyenConfigForCurrentSite throws an error', async () => {
        const mockError = new Error(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND)
        res.locals = {}
        await getEnvironment(req, res, next)

        expect(res.locals.response).toBeUndefined()
        expect(next).toHaveBeenCalledWith(mockError)
    })
})
