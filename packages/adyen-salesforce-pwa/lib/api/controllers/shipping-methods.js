import Logger from '../models/logger'
import {createShopperBasketsClient} from '../helpers/basketHelper.js'

async function getShippingMethods(req, res, next) {
    Logger.info('getShippingMethods', 'start')

    try {
        const {adyen: adyenContext} = res.locals
        const shopperBaskets = createShopperBasketsClient(adyenContext.authorization)

        const shippingMethodsResponse = await shopperBaskets.getShippingMethodsForShipment({
            parameters: {
                basketId: adyenContext.basket.basketId,
                shipmentId: 'me'
            }
        })

        const {applicableShippingMethods, defaultShippingMethodId} = shippingMethodsResponse

        if (applicableShippingMethods && applicableShippingMethods.length > 0) {
            const isDefaultMethodValid = applicableShippingMethods.some(
                (method) => method.id === defaultShippingMethodId
            )

            if (!isDefaultMethodValid) {
                Logger.warn(
                    'getShippingMethods',
                    `Default shipping method '${defaultShippingMethodId}' not found in applicable methods. Setting to first available method.`
                )
                shippingMethodsResponse.defaultShippingMethodId = applicableShippingMethods[0].id
            }
        }

        Logger.info('getShippingMethods', 'success')
        res.locals.response = shippingMethodsResponse
        next()
    } catch (err) {
        Logger.error('getShippingMethods', err.stack)
        next(err)
    }
}

async function setShippingMethod(req, res, next) {
    Logger.info('setShippingMethod', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        const {shippingMethodId} = req.body
        const updatedBasket = await adyenContext.basketService.setShippingMethod(shippingMethodId)

        Logger.info('setShippingMethod', 'success')
        res.locals.response = updatedBasket
        next()
    } catch (err) {
        Logger.error('setShippingMethod', err.stack)
        next(err)
    }
}

export default {getShippingMethods, setShippingMethod}
