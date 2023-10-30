import {createCheckoutResponse} from '../utils/createCheckoutResponse.mjs'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'

async function sendPaymentDetails(req, res) {
    Logger.info('sendPaymentDetails', 'start')
    const checkout = AdyenCheckoutConfig.getInstance()
    try {
        const {data} = req.body
        const response = await checkout.instance.paymentsDetails(data)
        Logger.info('sendPaymentDetails', `resultCode ${response.resultCode}`)
        res.json(createCheckoutResponse(response))
    } catch (err) {
        Logger.error('sendPaymentDetails', err.message)
        res.status(err.statusCode || 500).json(err.message)
    }
}

export default sendPaymentDetails
