/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
const {ShopperCustomers} = require('commerce-sdk-isomorphic')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')
const {getCurrencyValueForApi} = require('../utils/parsers')
const {BLOCKED_PAYMENT_METHODS} = require('../../overrides/app/constants')

async function fetch(req, res) {
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
            baskets: [
                {
                    orderTotal,
                    currency,
                    shipments: [
                        {
                            shippingAddress: {countryCode}
                        }
                    ]
                }
            ] = [
                {
                    shipments: [
                        {
                            shippingAddress: {}
                        }
                    ]
                }
            ]
        } = await shopperCustomers.getCustomerBaskets({
            parameters: {
                customerId: req.headers.customerid
            }
        })

        const response = await checkout.paymentMethods({
            blockedPaymentMethods: BLOCKED_PAYMENT_METHODS,
            shopperLocale: req.body?.locale?.id,
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

module.exports = {fetch}
