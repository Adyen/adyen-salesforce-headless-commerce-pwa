import {getCurrencyValueForApi} from '../utils/parsers.mjs'
import {BLOCKED_PAYMENT_METHODS} from '../utils/constants.mjs'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'

async function getPaymentMethods(req, res) {
    Logger.info('getPaymentMethods', 'start')
    const checkout = AdyenCheckoutConfig.getInstance()

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
        const [{orderTotal, currency}] = baskets

        const {
            locale: {id: shopperLocale}
        } = req.body
        const countryCode = shopperLocale?.slice(-2)

        const paymentMethodsRequest = {
            blockedPaymentMethods: BLOCKED_PAYMENT_METHODS,
            shopperLocale,
            countryCode,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
            shopperReference: req.headers.customerid
        }

        if (baskets?.length) {
            paymentMethodsRequest.amount = {
                value: getCurrencyValueForApi(orderTotal, currency),
                currency: currency
            }
        }

        const response = await checkout.instance.paymentMethods(paymentMethodsRequest)

        Logger.info('getPaymentMethods', 'success')
        res.json({
            ...response,
            ADYEN_CLIENT_KEY: process.env.ADYEN_CLIENT_KEY,
            ADYEN_ENVIRONMENT: process.env.ADYEN_ENVIRONMENT
        })
    } catch (err) {
        Logger.error('getPaymentMethods', err.message)
        res.status(err.statusCode || 500).json(err.message)
    }
}

export default getPaymentMethods
