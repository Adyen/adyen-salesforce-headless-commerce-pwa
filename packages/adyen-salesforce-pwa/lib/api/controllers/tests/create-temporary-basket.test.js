import CreateTemporaryBasketController from '../create-temporary-basket'
import {AdyenError} from '../../models/AdyenError'
import Logger from '../../models/logger'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'
import {BasketService} from '../../models/basketService.js'
import {createTemporaryBasket, removeExistingTemporaryBaskets} from '../../helpers/basketHelper'

jest.mock('../../models/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}))

jest.mock('../../models/basketService.js')
jest.mock('../../helpers/basketHelper', () => ({
    createTemporaryBasket: jest.fn(),
    removeExistingTemporaryBaskets: jest.fn()
}))
jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs', () => ({
    getAdyenConfigForCurrentSite: jest.fn(() => ({
        apiKey: 'test',
        env: 'test'
    }))
}))

describe('create-temporary-basket controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
        req = {
            headers: {
                authorization: 'Bearer token',
                customerid: 'customer1'
            },
            query: {
                siteId: 'RefArch'
            },
            body: {
                product: {
                    id: 'p1',
                    quantity: 2
                }
            }
        }
        res = {
            locals: {}
        }
        next = jest.fn()
    })

    it('creates a temporary basket and returns expected response', async () => {
        const mockBasket = {basketId: 'b1', orderTotal: 0}
        const mockBasketService = {
            addProductToBasket: jest.fn().mockResolvedValue({
                ...mockBasket,
                orderTotal: 0
            })
        }
        BasketService.mockImplementation(() => mockBasketService)
        removeExistingTemporaryBaskets.mockResolvedValue(undefined)
        createTemporaryBasket.mockResolvedValue(mockBasket)

        await CreateTemporaryBasketController(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('CreateTemporaryBasketController', 'start')
        expect(BasketService).toHaveBeenCalled()
        expect(removeExistingTemporaryBaskets).toHaveBeenCalledWith('Bearer token', 'customer1')
        expect(createTemporaryBasket).toHaveBeenCalledWith('Bearer token', 'customer1')
        expect(res.locals.response).toEqual(mockBasket)
        expect(Logger.info).toHaveBeenCalledWith('CreateTemporaryBasketController', 'success')
        expect(next).toHaveBeenCalled()
    })

    it('calls next with AdyenError when required params are missing', async () => {
        req.headers = {}
        await CreateTemporaryBasketController(req, res, next)
        expect(next).toHaveBeenCalled()
        const errArg = next.mock.calls[0][0]
        expect(errArg).toBeInstanceOf(AdyenError)
        expect(errArg.message).toBe(ERROR_MESSAGE.INVALID_PARAMS)
    })
})
