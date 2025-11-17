import CreateTemporaryBasketController from '../create-temporary-basket'
import {AdyenError} from '../../models/AdyenError'
import Logger from '../../models/logger'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'
import {BasketService} from '../../models/basketService.js'

jest.mock('../../models/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}))

jest.mock('../../models/basketService.js')

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
            body: {}
        }
        res = {
            locals: {}
        }
        next = jest.fn()
    })

    it('creates a temporary basket and returns expected response without product', async () => {
        const mockBasket = {basketId: 'b1', orderTotal: 0}
        BasketService.mockImplementation(() => ({
            createTemporaryBasket: jest.fn().mockResolvedValue(mockBasket),
            addProductToBasket: jest.fn()
        }))

        await CreateTemporaryBasketController(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('CreateTemporaryBasketController', 'start')
        expect(BasketService).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            temporaryBasketCreated: true,
            amount: 0
        })
        expect(Logger.info).toHaveBeenCalledWith('CreateTemporaryBasketController', 'success')
        expect(next).toHaveBeenCalled()
    })

    it('creates a temporary basket and adds product when provided in body', async () => {
        const initialBasket = {basketId: 'b2', orderTotal: 0}
        const updatedBasket = {basketId: 'b2', orderTotal: 123.45}
        const addProductToBasket = jest.fn().mockResolvedValue(updatedBasket)
        BasketService.mockImplementation(() => ({
            createTemporaryBasket: jest.fn().mockResolvedValue(initialBasket),
            addProductToBasket
        }))
        req.body = {
            product: {productId: 'SKU123', quantity: 2}
        }

        await CreateTemporaryBasketController(req, res, next)

        expect(addProductToBasket).toHaveBeenCalledWith('b2', {
            productId: 'SKU123',
            quantity: 2
        })
        expect(res.locals.response).toEqual({
            temporaryBasketCreated: true,
            amount: 123.45
        })
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
