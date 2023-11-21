import {query} from 'express-validator'
import EnvironmentController from '../controllers/environment'
import PaymentMethodsController from '../controllers/payment-methods'
import PaymentsDetailsController from '../controllers/payments-details'
import PaymentsController from '../controllers/payments'
import {authenticate, validateHmac, parseNotification} from '../controllers/webhook'
import {authorizationWebhookHandler} from '../controllers/authorization-webhook-handler'
import Logger from '../controllers/logger'

const messages = {
    DEFAULT_ERROR: 'Technical error!'
}

function SuccessHandler(req, res) {
    Logger.info('Success', res.toString())
    return res.status(200).json(res.locals.response)
}

function ErrorHandler(err, req, res) {
    Logger.error(err.message, err.cause)
    res.status(err.statusCode || 500).json(err.message || messages.DEFAULT_ERROR)
}

export function registerAdyenEndpoints(app, runtime, overrides) {
    const environmentHandler = overrides?.environment || [
        EnvironmentController,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentMethodsHandler = overrides?.paymentMethods || [
        PaymentMethodsController,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentsDetailsHandler = overrides?.paymentsDetails || [
        PaymentsDetailsController,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentsHandler = overrides?.payments || [
        PaymentsController,
        SuccessHandler,
        ErrorHandler
    ]
    const webhooksHandler = overrides?.webhook || [
        authenticate,
        validateHmac,
        parseNotification,
        authorizationWebhookHandler,
        SuccessHandler,
        ErrorHandler
    ]

    app.get(
        '*/checkout',
        query('redirectResult').optional().escape(),
        query('amazonCheckoutSessionId').optional().escape(),
        runtime.render
    )
    app.get('/api/adyen/environment', ...environmentHandler)
    app.get('/api/adyen/paymentMethods', ...paymentMethodsHandler)
    app.post('/api/adyen/payments/details', ...paymentsDetailsHandler)
    app.post('/api/adyen/payments', ...paymentsHandler)
    app.post('/api/adyen/webhook', ...webhooksHandler)
}
