import {PaymentsApi} from '@adyen/api-library/lib/src/services/checkout/paymentsApi'
import {Client, Config} from '@adyen/api-library'
import {createCheckoutResponse} from '../utils/createCheckoutResponse.mjs'

async function sendPaymentDetails(req, res) {
    const config = new Config()
    config.apiKey = process.env.ADYEN_API_KEY
    const client = new Client({config})
    client.setEnvironment(process.env.ADYEN_ENVIRONMENT)
    const checkout = new PaymentsApi(client)

    try {
        const {data} = req.body
        const response = await checkout.paymentsDetails(data)
        res.json(createCheckoutResponse(response))
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message)
    }
}

export default sendPaymentDetails
