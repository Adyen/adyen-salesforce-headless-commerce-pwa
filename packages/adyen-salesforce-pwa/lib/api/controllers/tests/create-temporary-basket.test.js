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
            locals: {
                adyen: {
                    adyenConfig: {
                        apiKey: 'test',
                        env: 'test'
                    },
                    siteId: 'RefArch'
                }
            }
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
        expect(removeExistingTemporaryBaskets).toHaveBeenCalledWith(
            'Bearer token',
            'customer1',
            'RefArch'
        )
        expect(createTemporaryBasket).toHaveBeenCalledWith('Bearer token', 'customer1', 'RefArch')
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

    it('calls next with AdyenError when siteId is missing', async () => {
        req.query = {}
        await CreateTemporaryBasketController(req, res, next)
        const errArg = next.mock.calls[0][0]
        expect(errArg).toBeInstanceOf(AdyenError)
    })

    it('calls next with AdyenError when product id is missing', async () => {
        req.body.product = {quantity: 1}
        await CreateTemporaryBasketController(req, res, next)
        const errArg = next.mock.calls[0][0]
        expect(errArg).toBeInstanceOf(AdyenError)
    })

    it('calls next with AdyenError when product quantity is missing', async () => {
        req.body.product = {id: 'p1'}
        await CreateTemporaryBasketController(req, res, next)
        const errArg = next.mock.calls[0][0]
        expect(errArg).toBeInstanceOf(AdyenError)
    })

    it('calls next with AdyenError when basket creation returns null', async () => {
        removeExistingTemporaryBaskets.mockResolvedValue(undefined)
        createTemporaryBasket.mockResolvedValue(null)

        await CreateTemporaryBasketController(req, res, next)
        const errArg = next.mock.calls[0][0]
        expect(errArg).toBeInstanceOf(AdyenError)
        expect(errArg.message).toBe(ERROR_MESSAGE.BASKET_NOT_CREATED)
    })

    it('calls next with AdyenError when basket has no basketId', async () => {
        removeExistingTemporaryBaskets.mockResolvedValue(undefined)
        createTemporaryBasket.mockResolvedValue({})

        await CreateTemporaryBasketController(req, res, next)
        const errArg = next.mock.calls[0][0]
        expect(errArg).toBeInstanceOf(AdyenError)
        expect(errArg.message).toBe(ERROR_MESSAGE.BASKET_NOT_CREATED)
    })

    it('calls next with AdyenError when adyen context is missing', async () => {
        res.locals = {}
        removeExistingTemporaryBaskets.mockResolvedValue(undefined)
        createTemporaryBasket.mockResolvedValue({basketId: 'b1'})

        await CreateTemporaryBasketController(req, res, next)
        const errArg = next.mock.calls[0][0]
        expect(errArg).toBeInstanceOf(AdyenError)
        expect(errArg.message).toBe(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND)
    })
})
