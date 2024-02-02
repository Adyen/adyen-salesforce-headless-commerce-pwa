import {createCheckoutResponse} from '../../utils/createCheckoutResponse.mjs'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {v4 as uuidv4} from 'uuid'
import {AdyenError} from '../models/AdyenError'

const errorMessages = {
    PAYMENTS_DETAILS_NOT_SUCCESSFUL: 'payments details call not successful'
}

async function sendPaymentDetails(req, res, next) {
    Logger.info('sendPaymentDetails', 'start')

    try {
        const {data} = req.body

        const checkout = AdyenCheckoutConfig.getInstance()
        const response = await checkout.paymentsDetails(data, {
            idempotencyKey: uuidv4()
        })
        Logger.info('sendPaymentDetails', `resultCode ${response.resultCode}`)
        const checkoutResponse = createCheckoutResponse(response)
        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(errorMessages.PAYMENTS_DETAILS_NOT_SUCCESSFUL, 400)
        }
        res.locals.response = checkoutResponse
        next()
    } catch (err) {
        Logger.error('sendPaymentDetails', JSON.stringify(err))
        next(err)
    }
}

export default sendPaymentDetails
