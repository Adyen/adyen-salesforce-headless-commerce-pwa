import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import Logger from './logger'
import {ShopperBaskets} from 'commerce-sdk-isomorphic'

async function getShippingMethods(req, res, next) {
    Logger.info('getShippingMethods', 'start')

    try {
        const {app: appConfig} = getConfig()
        const shopperBaskets = new ShopperBaskets({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const shippingMethodsResponse = await shopperBaskets.getShippingMethodsForShipment({
            parameters: {
                basketId: req.headers.basketid,
                shipmentId: 'me'
            }
        })

        Logger.info('getShippingMethods', 'success')
        res.locals.response = shippingMethodsResponse
        next()
    } catch (err) {
        Logger.error('setShippingMethod', JSON.stringify(err))
        next(err)
    }
}

async function setShippingMethod(req, res, next) {
    Logger.info('setShippingMethod', 'start')

    try {
        const {app: appConfig} = getConfig()
        const shopperBaskets = new ShopperBaskets({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const basket = await shopperBaskets.updateShippingMethodForShipment({
            body: {
                id: req.body.shippingMethodId
            },
            parameters: {
                basketId: req.headers.basketid,
                shipmentId: 'me'
            }
        })

        Logger.info('setShippingMethod', 'success')
        res.locals.response = basket
        next()
    } catch (err) {
        Logger.error('setShippingMethod', JSON.stringify(err))
        next(err)
    }
}

export default {getShippingMethods, setShippingMethod}
