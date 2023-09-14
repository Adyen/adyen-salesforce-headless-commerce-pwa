/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'
const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
const {ShopperCustomers} = require('commerce-sdk-isomorphic')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')

const errorMessages = {
  AMOUNT_NOT_CORRECT: 'amount not correct'
}

function isAmountCorrect(amount, orderAmount) {
  return amount.value === orderAmount.value && amount.currency === orderAmount.currency
}

async function sendPaymentDetails(req, res) {
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

    const { details } = req.body;
    const response = await checkout.paymentsDetails({
      details
    })
    const orderAmount = {
      value: orderTotal,
      currency
    }
    if (!isAmountCorrect(response.amount, orderAmount)) {
      throw new Error(errorMessages.AMOUNT_NOT_CORRECT)
    }
    res.json(response)
  } catch (err) {
    res.status(err.statusCode || 500).json(err.message)
  }
}
module.exports = {sendPaymentDetails}
