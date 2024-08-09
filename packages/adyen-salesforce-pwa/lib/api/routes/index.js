import {query} from 'express-validator'
import bodyParser from 'body-parser'
import EnvironmentController from '../controllers/environment'
import PaymentMethodsController from '../controllers/payment-methods'
import PaymentsDetailsController from '../controllers/payments-details'
import PaymentsController from '../controllers/payments'
import ShippingAddressController from '../controllers/shipping-address'
import ShippingMethodsController from '../controllers/shipping-methods'
import {authenticate, parseNotification, validateHmac} from '../controllers/webhook'
import {authorizationWebhookHandler} from '../controllers/authorization-webhook-handler'
import {createErrorResponse} from '../../utils/createErrorResponse.mjs'
import Logger from '../controllers/logger'
import {appleDomainAssociation} from '../controllers/apple-domain-association'

function SuccessHandler(req, res) {
    Logger.info('Success')
    return res.status(200).json(res.locals.response)
}

function ErrorHandler(err, req, res, next) {
    Logger.error(err.message, err.cause)
    return res.status(err.statusCode || 500).json(createErrorResponse(err.message))
}

function registerAdyenEndpoints(app, runtime, overrides) {
    app.use(bodyParser.json())
    app.set('trust proxy', true)

    const environmentHandler = overrides?.environment || [EnvironmentController, SuccessHandler]
    const paymentMethodsHandler = overrides?.paymentMethods || [
        PaymentMethodsController,
        SuccessHandler
    ]
    const paymentsDetailsHandler = overrides?.paymentsDetails || [
        PaymentsDetailsController,
        SuccessHandler
    ]
    const paymentsHandler = overrides?.payments || [PaymentsController, SuccessHandler]
    const webhookHandler = overrides?.webhook || [
        authenticate,
        validateHmac,
        parseNotification,
        authorizationWebhookHandler,
        SuccessHandler
    ]
    const shippingMethodsPostHandler = overrides?.setShippingMethods || [
        ShippingMethodsController.setShippingMethod,
        SuccessHandler
    ]
    const shippingMethodsGetHandler = overrides?.getShippingMethods || [
        ShippingMethodsController.getShippingMethods,
        SuccessHandler
    ]
    const shippingAddressHandler = overrides?.shippingAddress || [
        ShippingAddressController,
        SuccessHandler
    ]
    const appleDomainAssociationHandler = overrides?.appleDomainAssociation || [
        appleDomainAssociation
    ]

    app.get(
        '*/checkout/redirect',
        query('redirectResult').optional().escape(),
        query('amazonCheckoutSessionId').optional().escape(),
        runtime.render
    )
    app.get(
        '*/checkout/confirmation/:orderNo',
        query('adyenAction').optional().escape(),
        runtime.render
    )
    app.get('/api/adyen/environment', ...environmentHandler)
    app.get('/api/adyen/paymentMethods', ...paymentMethodsHandler)
    app.get('/api/adyen/shipping-methods', ...shippingMethodsGetHandler)
    app.get(
        '/.well-known/apple-developer-merchantid-domain-association',
        ...appleDomainAssociationHandler
    )

    app.post('/api/adyen/payments/details', ...paymentsDetailsHandler)
    app.post('/api/adyen/payments', ...paymentsHandler)
    app.post('/api/adyen/webhook', ...webhookHandler)
    app.post('/api/adyen/shipping-methods', ...shippingMethodsPostHandler)
    app.post('/api/adyen/shipping-address', ...shippingAddressHandler)

    app.use(overrides?.ErrorHandler || ErrorHandler)
}

export {registerAdyenEndpoints, SuccessHandler, ErrorHandler}
