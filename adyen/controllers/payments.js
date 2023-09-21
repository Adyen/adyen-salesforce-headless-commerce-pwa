/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'
import {formatAddressInAdyenFormat} from "../utils/formatAddress.mjs";
import {getCurrencyValueForApi} from "../utils/parsers.mjs";
import {APPLICATION_VERSION, RESULT_CODES} from "../utils/constants.mjs";

const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
const {ShopperOrders} = require('commerce-sdk-isomorphic')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')

const errorMessages = {
    AMOUNT_NOT_CORRECT: 'amount not correct',
    INVALID_ORDER: 'order is invalid'
}

function createCheckoutResponse(response) {
    if (
      [
          RESULT_CODES.AUTHORISED,
          RESULT_CODES.REFUSED,
          RESULT_CODES.ERROR,
          RESULT_CODES.CANCELLED,
      ].includes(response.resultCode)
    ) {
        return {
            isFinal: true,
            isSuccessful:
              response.resultCode === RESULT_CODES.AUTHORISED,
            merchantReference: response.merchantReference,
        };
    }

    if (
      [
          RESULT_CODES.REDIRECTSHOPPER,
          RESULT_CODES.IDENTIFYSHOPPER,
          RESULT_CODES.CHALLENGESHOPPER,
          RESULT_CODES.PRESENTTOSHOPPER,
          RESULT_CODES.PENDING,
      ].includes(response.resultCode)
    ) {
        return {
            isFinal: false,
            action: response.action,
        };
    }

    if (response.resultCode === RESULT_CODES.RECEIVED) {
        return {
            isFinal: false,
        };
    }

    return {
        isFinal: true,
        isSuccessful: false,
    };
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
                orderNo: req.headers.orderno
            }
        })

        if (order.customerInfo?.customerId !== req.headers.customerid) {
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
            returnUrl: `http://localhost:3000/checkout`
        })

        res.json(createCheckoutResponse(response))
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
