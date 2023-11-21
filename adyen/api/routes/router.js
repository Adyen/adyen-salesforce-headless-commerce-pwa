import {query} from 'express-validator'
import EnvironmentController from '../controllers/environment'
import PaymentMethodsController from '../controllers/payment-methods'
import PaymentsDetailsController from '../controllers/payments-details'
import PaymentsController from '../controllers/payments'
import {
    authenticate,
    validateHmac,
    parseNotification,
    webhookSuccess,
    errorHandler
} from '../controllers/webhook'
import {authorizationWebhookHandler} from '../controllers/authorization-webhook-handler'

export function registerAdyenEndpoints(app, runtime) {
    app.get(
        '*/checkout',
        query('redirectResult').optional().escape(),
        query('amazonCheckoutSessionId').optional().escape(),
        runtime.render
    )
    app.get('/api/adyen/environment', EnvironmentController)
    app.get('/api/adyen/paymentMethods', PaymentMethodsController)
    app.post('/api/adyen/payments/details', PaymentsDetailsController)
    app.post('/api/adyen/payments', PaymentsController)
    app.post(
        '/api/adyen/webhook',
        authenticate,
        validateHmac,
        parseNotification,
        authorizationWebhookHandler,
        webhookSuccess,
        errorHandler
    )
}
