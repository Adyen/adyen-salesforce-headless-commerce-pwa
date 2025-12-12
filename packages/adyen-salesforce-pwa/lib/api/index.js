/**
 * This file is the main entry point for all backend API-related modules.
 * It exports controllers, middleware, and models to be used by the API routes.
 * The exports are grouped by their architectural layer for clarity and organization.
 */

// Route definitions
export * from './routes/index'

// Models & API Clients
export * from './models/orderApi'
export * from './models/customShopperOrderApi'
export * from './models/customAdminOrderApi'
export * from './models/adyenClientProvider'
export * from './models/PaymentRequestBuilder'
export * from './models/logger'

// Middleware
export * from './middleware/webhook'
export * from './middleware/webhook-request-context'
export * from './middleware/request-context'

// Controllers
export {default as ShippingAddressController} from './controllers/shipping-address'
export {default as ShippingMethodsController} from './controllers/shipping-methods'
export {default as PaymentsController} from './controllers/payments'
export {default as PaymentMethodsController} from './controllers/payment-methods'
export {default as PaymentsDetailsController} from './controllers/payments-details'
export {default as EnvironmentController} from './controllers/environment'
export {default as PaymentCancelController} from './controllers/payment-cancel'
export {default as GiftCardController} from './controllers/giftCard'
export {default as ShopperDetailsController} from './controllers/shopper-details'
export {default as PaymentDataReviewPageController} from './controllers/payment-data-review-page'

// Webhook event handlers
export * from './controllers/authorization-webhook-handler'
export * from './controllers/order-closed-webhook-handler'

// Helpers
export * from './helpers/basketHelper.js'
export * from './helpers/orderHelper.js'
export * from './helpers/paymentsHelper.js'
export * from './utils/paymentUtils.js'
