import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {BLOCKED_PAYMENT_METHODS} from '../../utils/constants.mjs'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {v4 as uuidv4} from 'uuid'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'

async function getPaymentMethods(req, res, next) {
    Logger.info('getPaymentMethods', 'start')
    const checkout = AdyenCheckoutConfig.getInstance()
    const adyenConfig = getAdyenConfigForCurrentSite()

    try {
        const {app: appConfig} = getConfig()
        const shopperCustomers = new ShopperCustomers({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const {baskets} = await shopperCustomers.getCustomerBaskets({
            parameters: {
                customerId: req.headers.customerid
            }
        })

        const {locale: shopperLocale} = req.query
        const countryCode = shopperLocale?.slice(-2)

        const paymentMethodsRequest = {
            blockedPaymentMethods: BLOCKED_PAYMENT_METHODS,
            shopperLocale,
            countryCode,
            merchantAccount: adyenConfig.merchantAccount,
            shopperReference: req.headers.customerid
        }

        if (baskets?.length) {
            const [{orderTotal, productTotal, currency}] = baskets
            paymentMethodsRequest.amount = {
                value: getCurrencyValueForApi(orderTotal || productTotal, currency),
                currency: currency
            }
        }

        const response = await checkout.instance.paymentMethods(paymentMethodsRequest, {
            idempotencyKey: uuidv4()
        })

        Logger.info('getPaymentMethods', 'success')
        res.locals.response = response
        next()
    } catch (err) {
        Logger.error('getPaymentMethods', err.message)
        next(err)
    }
}

export default getPaymentMethods
