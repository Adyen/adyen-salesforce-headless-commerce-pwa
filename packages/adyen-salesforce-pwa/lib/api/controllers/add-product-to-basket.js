import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {BasketService} from '../models/basketService'

/**
 * Adds product to the current shopper's basket.
 * Expects the following request metadata:
 * - headers.authorization: Shopper auth token (required)
 * - headers.customerid: Shopper customer id (required)
 * - body.product: Product to add to the basket (required)
 *   Each product should have: { id: string, quantity: number, optionItems?: Array, inventoryId?: string }
 */
export default async function AddProductToBasketController(req, res, next) {
    try {
        Logger.info('AddProductToBasketController', 'start')
        const {authorization, customerid} = req.headers
        const {siteId} = req.query
        const {product} = req.body

        if (!product) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        const adyenContext = {
            adyenConfig,
            siteId,
            authorization,
            customerId: customerid
        }

        const basketService = new BasketService(adyenContext, res)

        if (!product?.id || !product?.quantity) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        res.locals.response = await basketService.addProductToBasket(req.params.basketId, product)
        next()
    } catch (error) {
        Logger.error('AddProductsToBasketController', error.stack || error.message)
        next(error)
    }
}
