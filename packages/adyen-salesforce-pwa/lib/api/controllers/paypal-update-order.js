import Logger from '../models/logger'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import {v4 as uuidv4} from 'uuid'
import {AdyenError} from '../models/AdyenError'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {createShopperBasketsClient} from '../helpers/basketHelper.js'

/**
 * Updates shopper details in the basket.
 * This controller handles the addition of shopper-specific data to the current basket,
 * such as contact information, preferences, or other shopper-related details.
 *
 * @async
 * @function paypalUpdateOrder
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} Resolves when the shopper details are successfully updated.
 * @throws {Error} If the basket service fails to add shopper data.
 */
async function paypalUpdateOrder(req, res, next) {
    Logger.info('paypalUpdateOrder', 'start')

    try {
        const {adyen: adyenContext} = res.locals
        const {data} = req.body
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        const {basket} = adyenContext
        const pspReference = basket?.c_pspReference

        if (!pspReference) {
            throw new AdyenError('PSP reference not found in basket', 400)
        }

        const shopperBaskets = createShopperBasketsClient(adyenContext.authorization)

        const shippingMethodsResponse = await shopperBaskets.getShippingMethodsForShipment({
            parameters: {
                basketId: adyenContext.basket.basketId,
                shipmentId: 'me'
            }
        })
        const applicableShippingMethods = shippingMethodsResponse.applicableShippingMethods
        // Build the request according to Adyen API documentation
        const paypalUpdateOrderRequest = {
            amount: {
                currency: basket.currency,
                value: getCurrencyValueForApi(basket.orderTotal, basket.currency)
            },
            paymentData: data,
            pspReference
        }

        // Add deliveryMethods from applicableShippingMethods
        if (applicableShippingMethods && applicableShippingMethods.length > 0) {
            const selectedShippingMethodId = basket.shipments?.[0]?.shippingMethod?.id

            paypalUpdateOrderRequest.deliveryMethods = applicableShippingMethods.map((method) => ({
                amount: {
                    currency: basket.currency,
                    value: getCurrencyValueForApi(method.price || 0, basket.currency)
                },
                description: method.description
                    ? `${method.name} - ${method.description}`
                    : method.name || 'Shipping',
                reference: method.id,
                selected: method.id === selectedShippingMethodId,
                type: method.name || 'Shipping'
            }))
        }

        // Add taxTotal if available
        if (basket.taxTotal !== undefined && basket.taxTotal !== null) {
            paypalUpdateOrderRequest.taxTotal = {
                amount: {
                    currency: basket.currency,
                    value: getCurrencyValueForApi(basket.taxTotal, basket.currency)
                }
            }
        }
        const utilityApi = new AdyenClientProvider(adyenContext).getUtilityApi()
        const paypalUpdateOrderResponse = await utilityApi.updatesOrderForPaypalExpressCheckout(
            paypalUpdateOrderRequest,
            {
                idempotencyKey: uuidv4()
            }
        )
        Logger.info('paypalUpdateOrder', 'success')
        res.locals.response = paypalUpdateOrderResponse
        next()
    } catch (err) {
        Logger.error('paypalUpdateOrder', err.stack)
        next(err)
    }
}

export default paypalUpdateOrder
