import {prepareRequestContext} from '../request-context.js'
import {getBasket} from '../../helpers/basketHelper.js'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../../models/logger.js'
import {BasketService} from '../../models/basketService.js'
import {AdyenError} from '../../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

// Mock dependencies
jest.mock('../../helpers/basketHelper.js')
jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs')
jest.mock('../../models/logger.js')
jest.mock('../../models/basketService.js')

describe('prepareRequestContext middleware', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
        req = {
            originalUrl: '/api/adyen/test',
            headers: {
                authorization: 'Bearer mockToken',
                basketid: 'mockBasketId',
                customerid: 'mockCustomerId'
            },
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
        const mockBasket = {basketId: 'mockBasketId'}
        const mockAdyenConfig = {merchantAccount: 'mockAccount'}

        getBasket.mockResolvedValue(mockBasket)
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        await prepareRequestContext(req, res, next)

        expect(getBasket).toHaveBeenCalledWith('Bearer mockToken', 'mockBasketId', 'mockCustomerId')
        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch')
        expect(BasketService).toHaveBeenCalled()

        expect(res.locals.adyen).toBeDefined()
        expect(res.locals.adyen.basket).toEqual(mockBasket)
        expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
        expect(res.locals.adyen.basketService).toBeInstanceOf(BasketService)

        expect(Logger.info).toHaveBeenCalledWith(
            'prepareRequestContext for /api/adyen/test',
            'success'
        )
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should call next with an error if required headers are missing', async () => {
        req.headers.authorization = undefined
        req.headers.basketid = undefined

        await prepareRequestContext(req, res, next)

        const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        expect(next).toHaveBeenCalledWith(expectedError)
        expect(Logger.error).toHaveBeenCalledWith(
            'prepareRequestContext for /api/adyen/test',
            'Missing required parameters: authorization header, basketid header'
        )
    })

    test('should call next with an error if siteId query param is missing', async () => {
        req.query.siteId = undefined

        await prepareRequestContext(req, res, next)

        const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        expect(next).toHaveBeenCalledWith(expectedError)
        expect(Logger.error).toHaveBeenCalledWith(
            'prepareRequestContext for /api/adyen/test',
            'Missing required parameters: siteId query param'
        )
    })

    test('should call next with an error if getBasket fails', async () => {
        const mockError = new Error('Failed to fetch basket')
        getBasket.mockRejectedValue(mockError)

        await prepareRequestContext(req, res, next)

        expect(next).toHaveBeenCalledWith(mockError)
        expect(Logger.error).toHaveBeenCalledWith(
            'prepareRequestContext for /api/adyen/test',
            mockError.stack
        )
    })

    test('should call next with an error if getAdyenConfigForCurrentSite fails', async () => {
        const mockError = new Error('Failed to get config')
        getBasket.mockResolvedValue({})
        getAdyenConfigForCurrentSite.mockImplementation(() => {
            throw mockError
        })

        await prepareRequestContext(req, res, next)

        expect(next).toHaveBeenCalledWith(mockError)
        expect(Logger.error).toHaveBeenCalledWith(
            'prepareRequestContext for /api/adyen/test',
            mockError.stack
        )
    })
})
