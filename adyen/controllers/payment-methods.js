import {getCurrencyValueForApi} from '../utils/parsers.mjs'
import {BLOCKED_PAYMENT_METHODS} from '../utils/constants.mjs'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from '../services/checkout-config'

async function getPaymentMethods(req, res) {
    const checkout = AdyenCheckoutConfig.getInstance()

    try {
        const {app: appConfig} = getConfig()
        const shopperCustomers = new ShopperCustomers({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const {
            baskets: [{orderTotal, currency}]
        } = await shopperCustomers.getCustomerBaskets({
            parameters: {
                customerId: req.headers.customerid
            }
        })

        const {
            locale: {id: shopperLocale}
        } = req.body
        const countryCode = shopperLocale?.slice(-2)

        const response = await checkout.instance.paymentMethods({
            blockedPaymentMethods: BLOCKED_PAYMENT_METHODS,
            shopperLocale,
            countryCode,
            amount: {
                value: getCurrencyValueForApi(orderTotal, currency),
                currency: currency
            },
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
            shopperReference: req.headers.customerid
        })

        res.json({
            ...response,
            ADYEN_CLIENT_KEY: process.env.ADYEN_CLIENT_KEY,
            ADYEN_ENVIRONMENT: process.env.ADYEN_ENVIRONMENT
        })
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message)
    }
}

export default getPaymentMethods
