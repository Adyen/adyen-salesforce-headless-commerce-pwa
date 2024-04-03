import ShippingMethods from '../shipping-methods'
import Logger from '../logger'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ShopperBaskets} from 'commerce-sdk-isomorphic'

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config')
jest.mock('../logger')
jest.mock('commerce-sdk-isomorphic')

describe('setShippingMethod', () => {
    let req, res, next, getConfigMock, shopperBasketsInstanceMock

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'Bearer token',
                basketid: 'basket-id'
            },
            body: {
                shippingMethodId: 'method-id'
            }
        }
        res = {
            locals: {}
        }
        next = jest.fn()
        getConfigMock = jest.fn(() => ({
            app: {
                commerceAPI: {
                    parameters: {
                        siteId: 'RefArch'
                    }
                }
            }
        }))
        getConfig.mockImplementation(getConfigMock)
        shopperBasketsInstanceMock = {
            updateShippingMethodForShipment: jest.fn().mockResolvedValue({})
        }
        ShopperBaskets.mockImplementation(() => shopperBasketsInstanceMock)
    })

    it('should call the appropriate functions and set response in locals', async () => {
        await ShippingMethods.setShippingMethod(req, res, next)
        expect(Logger.info).toHaveBeenCalledWith('setShippingMethod', 'start')
        expect(getConfigMock).toHaveBeenCalled()
        expect(shopperBasketsInstanceMock.updateShippingMethodForShipment).toHaveBeenCalledWith({
            body: {
                id: 'method-id'
            },
            parameters: {
                basketId: 'basket-id',
                shipmentId: 'me'
            }
        })
        expect(Logger.info).toHaveBeenCalledWith('setShippingMethod', 'success')
        expect(res.locals.response).toEqual({})
        expect(next).toHaveBeenCalled()
    })

    it('should call next with error if an error occurs', async () => {
        const error = new Error('Test error')
        shopperBasketsInstanceMock.updateShippingMethodForShipment.mockRejectedValue(error)
        await ShippingMethods.setShippingMethod(req, res, next)
        expect(Logger.error).toHaveBeenCalledWith('setShippingMethod', JSON.stringify(error))
        expect(next).toHaveBeenCalledWith(error)
    })
})
