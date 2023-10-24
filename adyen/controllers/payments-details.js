import {createCheckoutResponse} from '../utils/createCheckoutResponse.mjs'
import AdyenCheckoutConfig from './checkout-config'

async function sendPaymentDetails(req, res) {
    const checkout = AdyenCheckoutConfig.getInstance()
    try {
        const {data} = req.body
        const response = await checkout.instance.paymentsDetails(data)
        res.json(createCheckoutResponse(response))
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message)
    }
}

export default sendPaymentDetails
