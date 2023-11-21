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

export function registerAdyenEndpoints(app, runtime, overrides) {
    app.get(
        '*/checkout',
        query('redirectResult').optional().escape(),
        query('amazonCheckoutSessionId').optional().escape(),
        runtime.render
    )

    const environmentHandler = overrides?.environment || [EnvironmentController]
    const paymentMethodsHandler = overrides?.paymentMethods || [PaymentMethodsController]
    const paymentsDetailsHandler = overrides?.paymentsDetails || [PaymentsDetailsController]
    const paymentsHandler = overrides?.payments || [PaymentsController]
    const webhooksHandler = overrides?.webhook || [
        authenticate,
        validateHmac,
        parseNotification,
        authorizationWebhookHandler,
        webhookSuccess,
        errorHandler
    ]

    app.get('/api/adyen/environment', ...environmentHandler)
    app.get('/api/adyen/paymentMethods', ...paymentMethodsHandler)
    app.post('/api/adyen/payments/details', ...paymentsDetailsHandler)
    app.post('/api/adyen/payments', ...paymentsHandler)
    app.post('/api/adyen/webhook', ...webhooksHandler)
}
