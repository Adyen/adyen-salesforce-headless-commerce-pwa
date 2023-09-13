/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'
const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
const {ShopperCustomers} = require('commerce-sdk-isomorphic')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')
const {BLOCKED_PAYMENT_METHODS} = import('../utils/constants.mjs')
const {getCurrencyValueForApi} = import('../utils/parsers.mjs')
async function getPaymentMethods(req, res) {
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

        const {
            locale: {id: shopperLocale}
        } = req.body
        const countryCode = shopperLocale?.slice(-2)

        const response = await checkout.paymentMethods({
            blockedPaymentMethods: BLOCKED_PAYMENT_METHODS,
            shopperLocale,
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
module.exports = getPaymentMethods
