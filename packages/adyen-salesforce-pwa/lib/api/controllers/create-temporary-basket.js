import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {BasketService} from '../models/basketService.js'
import {createTemporaryBasket, removeExistingTemporaryBaskets} from '../helpers/basketHelper'

/**
 * Creates a temporary basket for the current shopper.
 * Expects the following request metadata:
 * - headers.authorization: Shopper auth token (required)
 * - headers.customerid: Shopper customer id (required)
 * - query.siteId: Current site id (required)
 */
export default async function CreateTemporaryBasketController(req, res, next) {
    try {
        Logger.info('CreateTemporaryBasketController', 'start')
        const {authorization, customerid} = req.headers
        const {siteId} = req.query
        const {product} = req.body
        if (!authorization || !customerid || !siteId || !product?.id || !product?.quantity) {
            const missing = []
            if (!authorization) missing.push('authorization header')
            if (!customerid) missing.push('customerid header')
            if (!siteId) missing.push('siteId query param')
            if (!product?.id) missing.push('productId body param')
            if (!product?.quantity) missing.push('productQuantity body param')
            Logger.error(
                'CreateTemporaryBasketController',
                `Missing required parameters: ${missing.join(', ')}`
            )
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        await removeExistingTemporaryBaskets(authorization, customerid)

        let basket = await createTemporaryBasket(authorization, customerid)
        if (!basket || !basket.basketId) {
            throw new AdyenError(ERROR_MESSAGE.BASKET_NOT_CREATED, 400)
        }

        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        const adyenContext = {
            adyenConfig,
            siteId,
            authorization,
            customerId: customerid,
            basket: null
        }
        const basketService = new BasketService(adyenContext, res)
        basket = await basketService.addProductToBasket(basket?.basketId, product)
        adyenContext.basketService = basketService
        adyenContext.basket = basket

        res.locals.adyen = adyenContext
        res.locals.response = basket

        Logger.info('CreateTemporaryBasketController', 'success')
        return next()
    } catch (err) {
        Logger.error('CreateTemporaryBasketController', err.stack)
        return next(err)
    }
}
