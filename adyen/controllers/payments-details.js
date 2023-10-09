/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'
const {CheckoutAPI, Client, Config} = require('@adyen/api-library')
import {createCheckoutResponse} from '../utils/createCheckoutResponse.mjs'

async function sendPaymentDetails(req, res) {
    const config = new Config()
    config.apiKey = process.env.ADYEN_API_KEY
    const client = new Client({config})
    client.setEnvironment(process.env.ADYEN_ENVIRONMENT)
    const checkout = new CheckoutAPI(client)

    try {
        const {details} = req.body
        const response = await checkout.paymentsDetails({
            details
        })
        res.json(createCheckoutResponse(response))
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message)
    }
}

export default sendPaymentDetails
