import {prepareWebhookRequestContext} from '../webhook-request-context.js'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../../models/logger.js'
import {AdyenError} from '../../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

// Mock dependencies
jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs')
jest.mock('../../models/logger.js')

describe('prepareWebhookRequestContext middleware', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
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

    test('should successfully prepare context and call next', async () => {
        const mockAdyenConfig = {merchantAccount: 'mockAccount'}
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        await prepareWebhookRequestContext(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch')
        expect(res.locals.adyen).toBeDefined()
        expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
        expect(res.locals.adyen.siteId).toBe('RefArch')
        expect(Logger.info).toHaveBeenCalledWith('prepareWebhookRequestContext', 'success')
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should call next with an error if siteId is missing', async () => {
        req.query = {} // No siteId

        await prepareWebhookRequestContext(req, res, next)

        const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        expect(next).toHaveBeenCalledWith(expectedError)
        expect(getAdyenConfigForCurrentSite).not.toHaveBeenCalled()
    })

    test('should call next with an error if getAdyenConfigForCurrentSite fails', async () => {
        const mockError = new Error('Failed to get config')
        getAdyenConfigForCurrentSite.mockImplementation(() => {
            throw mockError
        })

        await prepareWebhookRequestContext(req, res, next)

        expect(next).toHaveBeenCalledWith(mockError)
    })
})
