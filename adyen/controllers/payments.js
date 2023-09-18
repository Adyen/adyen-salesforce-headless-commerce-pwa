/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'
const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
const {ShopperOrders} = require('commerce-sdk-isomorphic')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')
const {formatAddressInAdyenFormat} = import('../utils/formatAddress.mjs')
const {getCurrencyValueForApi} = import('../utils/parsers.mjs')
const {APPLICATION_VERSION} = import('../utils/constants.mjs')

const errorMessages = {
    AMOUNT_NOT_CORRECT: 'amount not correct',
    INVALID_ORDER: 'order is invalid'
}
async function sendPayments(req, res) {
    const config = new Config()
    config.apiKey = process.env.ADYEN_API_KEY
    const client = new Client({config})
    client.setEnvironment(process.env.ADYEN_ENVIRONMENT)
    const checkout = new CheckoutAPI(client)

    try {
        const {app: appConfig} = getConfig()

        const shopperOrders = new ShopperOrders({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const order = await shopperOrders.getOrder({
            parameters: {
                orderNo: req.headers.orderNo
            }
        })

        if (order.customerInfo?.customerId !== req.headers.customerId) {
            throw new Error(errorMessages.INVALID_ORDER)
        }


        const {data} = req.body
        const response = await checkout.payments({
            ...data,
            billingAddress: formatAddressInAdyenFormat(order.billingAddress),
            deliveryAddress: formatAddressInAdyenFormat(order.shipments[0].shippingAddress),
            reference: order.orderNo,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
            amount: {
                value: getCurrencyValueForApi(order.orderTotal, order.currency),
                currency: order.currency
            },
            applicationInfo: getApplicationInfo(),
            returnUrl: `${appConfig.baseUri}/checkout/confirmation/${order.orderNo}`
        })

        res.json(response)
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message)
    }
}

function getApplicationInfo() {
    return {
        merchantApplication: {
            name: 'adyen-salesforce-commerce-cloud',
            version: APPLICATION_VERSION
        },
        externalPlatform: {
            name: 'SalesforceCommerceCloud',
            version: 'PWA',
            integrator: process.env.SYSTEM_INTEGRATOR_NAME
        }
    }
}
module.exports = {sendPayments}
