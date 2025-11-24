import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {BasketService} from '../models/basketService.js'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {getCustomerBaskets} from '../helpers/customerHelper'

async function removeExistingTemporaryBaskets(customerId) {
    try {
        const existingBaskets = await getCustomerBaskets(customerId)
        const tempBaskets = existingBaskets.baskets?.filter((b) => b?.temporaryBasket)
        if (tempBaskets?.length) {
            await Promise.all(
                tempBaskets.map((b) =>
                    this.shopperBaskets.deleteBasket({
                        parameters: {basketId: b.basketId}
                    })
                )
            )
        }
    } catch (e) {
        Logger.error('removeExistingTemporaryBaskets', e.stack || e.message)
    }
}

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

        if (!authorization || !customerid || !siteId) {
            const missing = []
            if (!authorization) missing.push('authorization header')
            if (!customerid) missing.push('customerid header')
            if (!siteId) missing.push('siteId query param')
            Logger.error(
                'CreateTemporaryBasketController',
                `Missing required parameters: ${missing.join(', ')}`
            )
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
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
        await basketService.removeExistingTemporaryBaskets()
        let basket = await basketService.createTemporaryBasket()

        adyenContext.basketService = basketService
        adyenContext.basket = basket

        res.locals.adyen = adyenContext

        const {product} = req.body || {}
        if (basket?.basketId && product?.id && product?.quantity) {
            basket = await adyenContext.basketService.addProductToBasket(basket?.basketId, product)
        }

        res.locals.response = {
            basketId: basket?.basketId,
            temporaryBasketCreated: Boolean(basket?.basketId),
            amount: {
                currency: basket?.currency,
                value: getCurrencyValueForApi(basket?.orderTotal, basket?.currency)
            }
        }

        Logger.info('CreateTemporaryBasketController', 'success')
        return next()
    } catch (err) {
        Logger.error('CreateTemporaryBasketController', err.stack)
        return next(err)
    }
}
