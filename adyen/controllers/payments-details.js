import {createCheckoutResponse} from '../utils/createCheckoutResponse.mjs'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {createErrorResponse} from '../utils/createErrorResponse.mjs'

const errorMessages = {
    PAYMENTS_DETAILS_NOT_SUCCESSFUL: 'payments details call not successful'
}

async function sendPaymentDetails(req, res) {
    Logger.info('sendPaymentDetails', 'start')
    const checkout = AdyenCheckoutConfig.getInstance()
    try {
        const {data} = req.body
        const response = await checkout.instance.paymentsDetails(data)
        Logger.info('sendPaymentDetails', `resultCode ${response.resultCode}`)
        const checkoutResponse = createCheckoutResponse(response)
        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new Error(errorMessages.PAYMENTS_DETAILS_NOT_SUCCESSFUL)
        }
        res.json(checkoutResponse)
    } catch (err) {
        Logger.error('sendPaymentDetails', err.message)
        res.status(err.statusCode || 500).json(
            createErrorResponse(err.statusCode || 500, err.message)
        )
    }
}

export default sendPaymentDetails
