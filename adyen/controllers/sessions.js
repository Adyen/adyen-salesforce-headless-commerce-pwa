/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
const {ShopperCustomers} = require('commerce-sdk-isomorphic')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')
const {getCurrencyValueForApi} = require('../utils/parsers')

async function create(req, res) {
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
                    basketId,
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

        const response = await checkout.sessions({
            countryCode: countryCode,
            amount: {
                value: getCurrencyValueForApi(orderTotal, currency),
                currency: currency
            },
            reference: basketId, // todo: check if its valid to pass basketID
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, //todo: REPLACE With YOUR MERCHANT ACCOUNT
            returnUrl: process.env.HOST_URL //todo: REPLACE with a proper value  // required for 3ds2 redirect flow
        })

        res.json([
            {
                ...response,
                ADYEN_CLIENT_KEY: process.env.ADYEN_CLIENT_KEY,
                ADYEN_ENVIRONMENT: process.env.ADYEN_ENVIRONMENT
            }
        ]) // sending a tuple with orderRef as well to inform about the unique order reference
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message)
    }
}

module.exports = {create}
