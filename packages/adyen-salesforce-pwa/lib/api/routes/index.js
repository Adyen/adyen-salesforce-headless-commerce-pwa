import {query} from 'express-validator'
import bodyParser from 'body-parser'
import EnvironmentController from '../controllers/environment'
import PaymentMethodsController from '../controllers/payment-methods'
import PaymentsDetailsController from '../controllers/payments-details'
import PaymentsController from '../controllers/payments'
import ShippingAddressController from '../controllers/shipping-address'
import ShippingMethodsController from '../controllers/shipping-methods'
import {authenticate, parseNotification, validateHmac} from '../middleware/webhook'
import {authorizationWebhookHandler} from '../controllers/authorization-webhook-handler'
import {createErrorResponse} from '../../utils/createErrorResponse.mjs'
import Logger from '../models/logger'
import {appleDomainAssociation} from '../controllers/apple-domain-association'
import OrderCancelController from '../controllers/order-cancel';
import {balanceCheck, cancelOrder, createOrder} from "../controllers/giftCard";
import {prepareRequestContext} from '../middleware/request-context'
import {prepareWebhookRequestContext} from '../middleware/webhook-request-context'

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

    const appleDomainAssociationHandler = overrides?.appleDomainAssociation || [
        appleDomainAssociation,
    ]

    const environmentHandler = overrides?.environment || [
        prepareWebhookRequestContext,
        EnvironmentController,
        SuccessHandler
    ]

    const webhookHandler = overrides?.webhook || [
        prepareWebhookRequestContext,
        authenticate,
        validateHmac,
        parseNotification,
        authorizationWebhookHandler,
        SuccessHandler
    ]

    const paymentMethodsHandler = overrides?.paymentMethods || [
        prepareRequestContext,
        PaymentMethodsController,
        SuccessHandler
    ]
    const paymentsDetailsHandler = overrides?.paymentsDetails || [
        prepareRequestContext,
        PaymentsDetailsController,
        SuccessHandler
    ]
    const paymentsHandler = overrides?.payments || [prepareRequestContext, PaymentsController, SuccessHandler]

    const shippingMethodsPostHandler = overrides?.setShippingMethods || [
        prepareRequestContext,
        ShippingMethodsController.setShippingMethod,
        SuccessHandler
    ]
    const shippingMethodsGetHandler = overrides?.getShippingMethods || [
        prepareRequestContext,
        ShippingMethodsController.getShippingMethods,
        SuccessHandler
    ]
    const shippingAddressHandler = overrides?.shippingAddress || [
        prepareRequestContext,
        ShippingAddressController,
        SuccessHandler
    ]

    const orderCancelHandler = overrides?.onOrderCancel || [
        prepareRequestContext,
        OrderCancelController,
        SuccessHandler
    ]
    const balanceCheckHandler = overrides?.balanceCheck || [prepareRequestContext, balanceCheck, SuccessHandler]
    const createOrderHandler = overrides?.createOrder || [prepareRequestContext, createOrder, SuccessHandler]
    const cancelOrderHandler = overrides?.cancelOrder || [prepareRequestContext, cancelOrder, SuccessHandler]

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
    app.post('/api/adyen/order/cancel', ...orderCancelHandler)
    app.post('/api/adyen/gift-card/balance-check', ...balanceCheckHandler)
    app.post('/api/adyen/gift-card/create-order', ...createOrderHandler)
    app.post('/api/adyen/gift-card/cancel-order', ...cancelOrderHandler)


    app.use(overrides?.ErrorHandler || ErrorHandler)
}

export {registerAdyenEndpoints, SuccessHandler, ErrorHandler}
