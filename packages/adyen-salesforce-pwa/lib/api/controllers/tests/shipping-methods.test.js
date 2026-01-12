import ShippingMethods from '../shipping-methods'
import Logger from '../../models/logger'
import {createShopperBasketsClient} from '../../helpers/basketHelper.js'

jest.mock('../../models/logger')
jest.mock('../../helpers/basketHelper.js')

describe('Shipping Methods Controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
        req = {
            body: {
                shippingMethodId: 'method-id'
            }
        }
        res = {
            locals: {
                adyen: {
                    authorization: 'Bearer mockToken',
                    basket: {
                        basketId: 'mockBasketId'
                    },
                    basketService: {
                        setShippingMethod: jest.fn()
                    }
                }
            }
        }
        next = jest.fn()
    })

    describe('setShippingMethod', () => {
        it('should call basketService.setShippingMethod and set response in locals', async () => {
            const mockUpdatedBasket = {
                basketId: 'mockBasketId',
                shippingItems: [{shippingMethod: {id: 'method-id'}}]
            }
            res.locals.adyen.basketService.setShippingMethod.mockResolvedValue(mockUpdatedBasket)

            await ShippingMethods.setShippingMethod(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('setShippingMethod', 'start')
            expect(res.locals.adyen.basketService.setShippingMethod).toHaveBeenCalledWith(
                'method-id'
            )
            expect(Logger.info).toHaveBeenCalledWith('setShippingMethod', 'success')
            expect(res.locals.response).toEqual(mockUpdatedBasket)
            expect(next).toHaveBeenCalledWith()
            expect(next).toHaveBeenCalledTimes(1)
        })

        it('should call next with an error if basketService.setShippingMethod fails', async () => {
            const error = new Error('Test error')
            res.locals.adyen.basketService.setShippingMethod.mockRejectedValue(error)

            await ShippingMethods.setShippingMethod(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('setShippingMethod', error.stack)
            expect(next).toHaveBeenCalledWith(error)
        })
    })

    describe('getShippingMethods', () => {
        let shopperBasketsInstanceMock

        beforeEach(() => {
            shopperBasketsInstanceMock = {
                getShippingMethodsForShipment: jest.fn()
            }
            createShopperBasketsClient.mockReturnValue(shopperBasketsInstanceMock)
        })

        it('should call getShippingMethodsForShipment and set response in locals', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [{id: 'method-1'}, {id: 'method-2'}],
                defaultShippingMethodId: 'method-1'
            }
            shopperBasketsInstanceMock.getShippingMethodsForShipment.mockResolvedValue(
                mockShippingMethods
            )

            await ShippingMethods.getShippingMethods(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('getShippingMethods', 'start')
            expect(createShopperBasketsClient).toHaveBeenCalledWith('Bearer mockToken')
            expect(shopperBasketsInstanceMock.getShippingMethodsForShipment).toHaveBeenCalledWith({
                parameters: {
                    basketId: 'mockBasketId',
                    shipmentId: 'me'
                }
            })
            expect(Logger.info).toHaveBeenCalledWith('getShippingMethods', 'success')
            expect(res.locals.response).toEqual(mockShippingMethods)
            expect(res.locals.response.defaultShippingMethodId).toBe('method-1')
            expect(next).toHaveBeenCalledWith()
            expect(next).toHaveBeenCalledTimes(1)
        })

        it('should set defaultShippingMethodId to first method when default is not in applicable methods', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {id: 'method-1', name: 'Standard', price: 5.0},
                    {id: 'method-2', name: 'Express', price: 10.0}
                ],
                defaultShippingMethodId: 'invalid-method'
            }
            shopperBasketsInstanceMock.getShippingMethodsForShipment.mockResolvedValue(
                mockShippingMethods
            )
            res.locals.adyen.basketService.setShippingMethod.mockResolvedValue({})

            await ShippingMethods.getShippingMethods(req, res, next)

            expect(Logger.warn).toHaveBeenCalledWith(
                'getShippingMethods',
                "Default shipping method 'invalid-method' not found in applicable methods. Setting to first available method."
            )
            expect(res.locals.response.defaultShippingMethodId).toBe('method-1')
            expect(res.locals.response.applicableShippingMethods).toEqual(
                mockShippingMethods.applicableShippingMethods
            )
            expect(next).toHaveBeenCalledWith()
        })

        it('should keep defaultShippingMethodId when it exists in applicable methods', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {id: 'method-1', name: 'Standard', price: 5.0},
                    {id: 'method-2', name: 'Express', price: 10.0},
                    {id: 'method-3', name: 'Overnight', price: 20.0}
                ],
                defaultShippingMethodId: 'method-2'
            }
            shopperBasketsInstanceMock.getShippingMethodsForShipment.mockResolvedValue(
                mockShippingMethods
            )

            await ShippingMethods.getShippingMethods(req, res, next)

            expect(Logger.warn).not.toHaveBeenCalled()
            expect(res.locals.response.defaultShippingMethodId).toBe('method-2')
            expect(res.locals.adyen.basketService.setShippingMethod).not.toHaveBeenCalled()
            expect(next).toHaveBeenCalledWith()
        })

        it('should handle empty applicableShippingMethods array', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [],
                defaultShippingMethodId: 'method-1'
            }
            shopperBasketsInstanceMock.getShippingMethodsForShipment.mockResolvedValue(
                mockShippingMethods
            )

            await ShippingMethods.getShippingMethods(req, res, next)

            expect(Logger.warn).not.toHaveBeenCalled()
            expect(res.locals.response.defaultShippingMethodId).toBe('method-1')
            expect(next).toHaveBeenCalledWith()
        })

        it('should handle missing applicableShippingMethods', async () => {
            const mockShippingMethods = {
                defaultShippingMethodId: 'method-1'
            }
            shopperBasketsInstanceMock.getShippingMethodsForShipment.mockResolvedValue(
                mockShippingMethods
            )

            await ShippingMethods.getShippingMethods(req, res, next)

            expect(Logger.warn).not.toHaveBeenCalled()
            expect(res.locals.response.defaultShippingMethodId).toBe('method-1')
            expect(next).toHaveBeenCalledWith()
        })

        it('should handle undefined defaultShippingMethodId', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {id: 'method-1', name: 'Standard', price: 5.0},
                    {id: 'method-2', name: 'Express', price: 10.0}
                ],
                defaultShippingMethodId: undefined
            }
            shopperBasketsInstanceMock.getShippingMethodsForShipment.mockResolvedValue(
                mockShippingMethods
            )
            res.locals.adyen.basketService.setShippingMethod.mockResolvedValue({})

            await ShippingMethods.getShippingMethods(req, res, next)

            expect(Logger.warn).toHaveBeenCalledWith(
                'getShippingMethods',
                "Default shipping method 'undefined' not found in applicable methods. Setting to first available method."
            )
            expect(res.locals.response.defaultShippingMethodId).toBe('method-1')
            expect(next).toHaveBeenCalledWith()
        })

        it('should call next with an error if getShippingMethodsForShipment fails', async () => {
            const error = new Error('Test error')
            shopperBasketsInstanceMock.getShippingMethodsForShipment.mockRejectedValue(error)

            await ShippingMethods.getShippingMethods(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('getShippingMethods', error.stack)
            expect(next).toHaveBeenCalledWith(error)
        })
    })
})
