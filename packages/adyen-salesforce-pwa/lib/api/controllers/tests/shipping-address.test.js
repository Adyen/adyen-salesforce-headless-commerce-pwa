import updateShippingAddress from '../shipping-address'
import Logger from '../../models/logger'

jest.mock('../../models/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}))

describe('updateShippingAddress', () => {
    let req, res, next

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'Bearer token',
                basketid: 'basket123'
            },
            body: {
                data: {
                    deliveryAddress: {
                        street: '123 Main St',
                        city: 'City',
                        country: 'US',
                        postalCode: '12345',
                        stateOrProvince: 'State'
                    },
                    profile: {
                        firstName: 'John',
                        lastName: 'Doe',
                        phone: '1234567890'
                    }
                }
            }
        }
        res = {
            locals: {
                adyen: {
                    basketService: {
                        updateShippingAddress: jest.fn()
                    }
                }
            }
        }
        next = jest.fn()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should call basketService.updateShippingAddress and set the response in locals', async () => {
        const mockUpdatedBasket = {basketId: 'mockBasketId', shipments: [{shippingAddress: {}}]}
        res.locals.adyen.basketService.updateShippingAddress.mockResolvedValue(mockUpdatedBasket)

        await updateShippingAddress(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('updateShippingAddress', 'start')
        expect(res.locals.adyen.basketService.updateShippingAddress).toHaveBeenCalledWith(
            req.body.data
        )
        expect(Logger.info).toHaveBeenCalledWith('updateShippingAddress', 'success')
        expect(res.locals.response).toEqual(mockUpdatedBasket)
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('should call next with an error if basketService.updateShippingAddress fails', async () => {
        const error = new Error('Test error')
        res.locals.adyen.basketService.updateShippingAddress.mockRejectedValue(error)

        await updateShippingAddress(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('updateShippingAddress', 'start')
        expect(Logger.error).toHaveBeenCalledWith('updateShippingAddress', error.stack)
        expect(next).toHaveBeenCalledWith(error)
    })
})
