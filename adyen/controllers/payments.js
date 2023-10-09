/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'
import {formatAddressInAdyenFormat} from '../utils/formatAddress.mjs'
import {getCurrencyValueForApi} from '../utils/parsers.mjs'
import {APPLICATION_VERSION} from '../utils/constants.mjs'
import {createCheckoutResponse} from '../utils/createCheckoutResponse.mjs'

const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
const {ShopperOrders} = require('commerce-sdk-isomorphic')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')

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
                orderNo: req.headers.orderno
            }
        })

        if (order?.customerInfo?.customerId !== req.headers.customerid) {
            throw new Error(errorMessages.INVALID_ORDER)
        }

        const {data} = req.body
        const paymentRequest = {
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
            authenticationData: {
                threeDSRequestData: {
                    nativeThreeDS: 'preferred'
                }
            },
            channel: 'Web',
            returnUrl: `${data.origin}/checkout`
        }
        if (isOpenInvoiceMethod(data?.paymentMethod?.type)) {
            paymentRequest.lineItems = getLineItems(order)
        }
        const response = await checkout.payments(paymentRequest)

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

function isOpenInvoiceMethod(paymentMethod) {
    return (
        paymentMethod.indexOf('afterpay') > -1 ||
        paymentMethod.indexOf('klarna') > -1 ||
        paymentMethod.indexOf('ratepay') > -1 ||
        paymentMethod.indexOf('facilypay') > -1 ||
        paymentMethod === 'zip' ||
        paymentMethod === 'affirm' ||
        paymentMethod === 'clearpay'
    )
}

function getLineItems(order) {
    const productLineItems = order?.productItems.map((productItem) => {
        return {
            id: productItem.itemId,
            quantity: productItem.quantity,
            description: productItem.itemText,
            amountExcludingTax: getCurrencyValueForApi(productItem.basePrice, order.currency),
            taxAmount: getCurrencyValueForApi(productItem.tax, order.currency),
            taxCategory: productItem.taxClassId,
            taxPercentage: productItem.taxRate
        }
    })
    const shippingLineItems = order?.shippingItems.map((shippingItem) => {
        return {
            id: shippingItem.itemId,
            quantity: 1,
            description: shippingItem.itemText,
            amountExcludingTax: getCurrencyValueForApi(shippingItem.basePrice, order.currency),
            taxAmount: getCurrencyValueForApi(shippingItem.tax, order.currency),
            taxCategory: shippingItem.taxClassId,
            taxPercentage: shippingItem.taxRate
        }
    })
    const priceAdjustmentLineItems = order?.priceAdjustments.map((priceAdjustment) => {
        return {
            id: priceAdjustment.priceAdjustmentId,
            quantity: priceAdjustment.quantity,
            description: priceAdjustment.itemText,
            amountExcludingTax: getCurrencyValueForApi(priceAdjustment.basePrice, order.currency),
            taxAmount: getCurrencyValueForApi(priceAdjustment.tax, order.currency),
            taxCategory: priceAdjustment.taxClassId || 'None',
            taxPercentage: priceAdjustment.taxRate
        }
    })
    return [...productLineItems, ...shippingLineItems, ...priceAdjustmentLineItems]
}
module.exports = {sendPayments}
