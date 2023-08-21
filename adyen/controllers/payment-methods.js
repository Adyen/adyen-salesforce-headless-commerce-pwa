import {CheckoutAPI, Client, Config} from '@adyen/api-library'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {getCurrencyValueForApi} from '../utils/parsers'
import {BLOCKED_PAYMENT_METHODS} from '../utils/constants'

export async function getPaymentMethods(req, res) {
    const config = new Config()
    config.apiKey = process.env.ADYEN_API_KEY //REPLACE With YOUR API KEY
    const client = new Client({config})
    client.setEnvironment(process.env.ADYEN_ENVIRONMENT)
    const checkout = new CheckoutAPI(client)

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

        const { locale } = req.body;
        const countryCode = locale?.id?.slice(-2)
        const response = await checkout.paymentMethods({
            blockedPaymentMethods: BLOCKED_PAYMENT_METHODS,
            shopperLocale: locale.id,
            countryCode,
            amount: {
                value: getCurrencyValueForApi(orderTotal, currency),
                currency: currency
            },
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
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
