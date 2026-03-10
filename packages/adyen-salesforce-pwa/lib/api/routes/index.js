import {query} from 'express-validator'
import bodyParser from 'body-parser'
import EnvironmentController from '../controllers/environment'
import PaymentMethodsController, {getPaymentMethodsForExpress} from '../controllers/payment-methods'
import PaymentsDetailsController from '../controllers/payments-details'
import PaymentsController from '../controllers/payments'
import ShippingAddressController from '../controllers/shipping-address'
import ShippingMethodsController from '../controllers/shipping-methods'
import ShopperDetailsController from '../controllers/shopper-details'
import PaypalUpdateOrderController from '../controllers/paypal-update-order'
import PaymentDataReviewPageController from '../controllers/payment-data-review-page'
import CreateTemporaryBasketController from '../controllers/create-temporary-basket'
import OrderNumberController from '../controllers/order-number'
import {
    authenticate,
    parseNotification,
    sendNotification,
    validateHmac
} from '../middleware/webhook'
import {createErrorResponse} from '../../utils/createErrorResponse.mjs'
import Logger from '../models/logger'
import {appleDomainAssociation} from '../controllers/apple-domain-association'
import PaymentCancelController from '../controllers/payment-cancel'
import PaymentCancelExpressController from '../controllers/payment-cancel-express'
import {balanceCheck, cancelOrder, createOrder} from '../controllers/giftCard'
import {createRequestContext, prepareRequestContext} from '../middleware/request-context'
import {
    createMinimalRequestContext,
    prepareMinimalRequestContext
} from '../middleware/minimal-request-context'
import {
    createPaymentsDetailsContext,
    preparePaymentsDetailsContext
} from '../middleware/payments-details-request-context'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SuccessHandler(req, res, next) {
    Logger.info('Success Handler')
    return res.status(200).json(res.locals.response)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ErrorHandler(err, req, res, next) {
    Logger.info('Error Handler')
    Logger.error(err.message, err.cause)
    const errorResponse = createErrorResponse(err.message)
    if (err.newBasketId) {
        errorResponse.newBasketId = err.newBasketId
    }
    return res.status(err.statusCode || 500).json(errorResponse)
}

function registerAdyenEndpoints(app, runtime, overrides, options = {}) {
    app.use(bodyParser.json())
    app.set('trust proxy', true)

    const requestContext = createRequestContext(options)
    const minimalRequestContext = createMinimalRequestContext(options)
    const paymentsDetailsContext = createPaymentsDetailsContext(options)

    const appleDomainAssociationHandler = overrides?.appleDomainAssociation || [
        appleDomainAssociation,
        ErrorHandler
    ]

    const environmentHandler = overrides?.environment || [
        minimalRequestContext,
        EnvironmentController,
        SuccessHandler,
        ErrorHandler
    ]

    const webhookHandler = overrides?.webhook || [
        minimalRequestContext,
        authenticate,
        validateHmac,
        parseNotification,
        sendNotification,
        SuccessHandler
    ]

    const paymentMethodsHandler = overrides?.paymentMethods || [
        requestContext,
        PaymentMethodsController,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentMethodsForExpressHandler = overrides?.paymentMethodsForExpress || [
        minimalRequestContext,
        getPaymentMethodsForExpress,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentsDetailsHandler = overrides?.paymentsDetails || [
        paymentsDetailsContext,
        PaymentsDetailsController,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentsHandler = overrides?.payments || [
        requestContext,
        PaymentsController,
        SuccessHandler,
        ErrorHandler
    ]

    const shippingMethodsPostHandler = overrides?.setShippingMethods || [
        requestContext,
        ShippingMethodsController.setShippingMethod,
        SuccessHandler,
        ErrorHandler
    ]
    const shippingMethodsGetHandler = overrides?.getShippingMethods || [
        requestContext,
        ShippingMethodsController.getShippingMethods,
        SuccessHandler,
        ErrorHandler
    ]
    const shippingAddressHandler = overrides?.shippingAddress || [
        requestContext,
        ShippingAddressController,
        SuccessHandler,
        ErrorHandler
    ]
    const shopperDetailsHandler = overrides?.shopperDetails || [
        requestContext,
        ShopperDetailsController,
        SuccessHandler,
        ErrorHandler
    ]

    const paymentCancelController = overrides?.paymentCancel || [
        minimalRequestContext,
        PaymentCancelController,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentCancelExpressController = overrides?.paymentCancelExpress || [
        requestContext,
        PaymentCancelExpressController,
        SuccessHandler,
        ErrorHandler
    ]
    const balanceCheckHandler = overrides?.balanceCheck || [
        requestContext,
        balanceCheck,
        SuccessHandler,
        ErrorHandler
    ]
    const createOrderHandler = overrides?.createOrder || [
        requestContext,
        createOrder,
        SuccessHandler,
        ErrorHandler
    ]
    const cancelOrderHandler = overrides?.cancelOrder || [
        requestContext,
        cancelOrder,
        SuccessHandler,
        ErrorHandler
    ]
    const paypalUpdateOrderHandler = overrides?.paypalUpdateOrder || [
        requestContext,
        PaypalUpdateOrderController,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentDataForReviewPageGetHandler = overrides?.getPaymentDataForReviewPage || [
        requestContext,
        PaymentDataReviewPageController.getPaymentDataForReviewPage,
        SuccessHandler,
        ErrorHandler
    ]
    const paymentDataForReviewPagePostHandler = overrides?.setPaymentDataForReviewPage || [
        requestContext,
        PaymentDataReviewPageController.setPaymentDataForReviewPage,
        SuccessHandler,
        ErrorHandler
    ]

    const createTemporaryBasketHandler = overrides?.createTemporaryBasket || [
        minimalRequestContext,
        CreateTemporaryBasketController,
        SuccessHandler,
        ErrorHandler
    ]
    const orderNumberHandler = overrides?.orderNumber || [
        requestContext,
        OrderNumberController,
        SuccessHandler,
        ErrorHandler
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
    app.get('*/checkout', query('adyenAction').optional().escape(), runtime.render)
    app.get('/api/adyen/environment', ...environmentHandler)
    app.get('/api/adyen/paymentMethods', ...paymentMethodsHandler)
    app.get('/api/adyen/paymentMethodsForExpress', ...paymentMethodsForExpressHandler)
    app.get('/api/adyen/shipping-methods', ...shippingMethodsGetHandler)
    app.get(
        '/.well-known/apple-developer-merchantid-domain-association',
        ...appleDomainAssociationHandler
    )
    app.get('/api/adyen/payment-data-for-review-page', ...paymentDataForReviewPageGetHandler)
    app.post('/api/adyen/payment/cancel', ...paymentCancelController)
    app.post('/api/adyen/payment/cancel/express', ...paymentCancelExpressController)
    app.post('/api/adyen/payments/details', ...paymentsDetailsHandler)
    app.post('/api/adyen/payments', ...paymentsHandler)
    app.post('/api/adyen/webhook', ...webhookHandler)
    app.post('/api/adyen/shipping-methods', ...shippingMethodsPostHandler)
    app.post('/api/adyen/shipping-address', ...shippingAddressHandler)
    app.post('/api/adyen/shopper-details', ...shopperDetailsHandler)
    app.post('/api/adyen/paypal-update-order', ...paypalUpdateOrderHandler)
    app.post('/api/adyen/gift-card/balance-check', ...balanceCheckHandler)
    app.post('/api/adyen/gift-card/create-order', ...createOrderHandler)
    app.post('/api/adyen/gift-card/cancel-order', ...cancelOrderHandler)
    app.post('/api/adyen/payment-data-for-review-page', ...paymentDataForReviewPagePostHandler)
    app.get('/api/adyen/order-number', ...orderNumberHandler)
    app.post('/api/adyen/pdp/temporary-baskets', ...createTemporaryBasketHandler)
}

export {registerAdyenEndpoints, SuccessHandler, ErrorHandler}
