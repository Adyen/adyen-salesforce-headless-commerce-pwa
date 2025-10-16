export const PAYMENT_METHODS = {
    ADYEN_COMPONENT: 'AdyenComponent',
    CREDIT_CARD: 'CREDIT_CARD'
}

export const PAYMENT_METHOD_TYPES = {
    GIFT_CARD: 'giftcard',
    WECHATPAY_MINI_PROGRAM: 'wechatpayMiniProgram',
    WECHATPAY_QR: 'wechatpayQR',
    WECHATPAY_SDK: 'wechatpaySDK'
}

export const RESULT_CODES = {
    AUTHORISED: 'Authorised',
    CANCELLED: 'Cancelled',
    CHALLENGE_SHOPPER: 'ChallengeShopper',
    ERROR: 'Error',
    IDENTIFY_SHOPPER: 'IdentifyShopper',
    PENDING: 'Pending',
    PRESENT_TO_SHOPPER: 'PresentToShopper',
    RECEIVED: 'Received',
    REDIRECT_SHOPPER: 'RedirectShopper',
    REFUSED: 'Refused',
}

export const BLOCKED_PAYMENT_METHODS = [
    PAYMENT_METHOD_TYPES.WECHATPAY_MINI_PROGRAM,
    PAYMENT_METHOD_TYPES.WECHATPAY_QR,
    PAYMENT_METHOD_TYPES.WECHATPAY_SDK
]

export const SHOPPER_INTERACTIONS = {
    CONT_AUTH: 'ContAuth',
    ECOMMERCE: 'Ecommerce',
};

export const RECURRING_PROCESSING_MODEL = {
    CARD_ON_FILE: 'CardOnFile',
};

export const GIFT_CARD_RESULT_CODES = {
    NOTENOUGHBALANCE: 'NotEnoughBalance',
    SUCCESS: 'Success',
}

export const NOTIFICATION_EVENT_CODES = {
    AUTHORISATION: 'AUTHORISATION',
    ORDER_CLOSED: 'ORDER_CLOSED',
}

export const NOTIFICATION_SUCCESS = {
    TRUE: 'true',
    FALSE: 'false',
}

export const ORDER = Object.freeze({
    ORDER_STATUS_CREATED: 'created',
    ORDER_STATUS_NEW: 'new',
    ORDER_STATUS_COMPLETED: 'completed',
    ORDER_STATUS_CANCELED: 'cancelled',
    ORDER_STATUS_FAILED: 'failed',
    ORDER_STATUS_FAILED_REOPEN: 'failed_with_reopen',
    PAYMENT_STATUS_PAID: 'paid',
    PAYMENT_STATUS_PART_PAID: 'part_paid',
    PAYMENT_STATUS_NOT_PAID: 'not_paid',
    EXPORT_STATUS_READY: 'ready',
    EXPORT_STATUS_FAILED: 'failed',
    EXPORT_STATUS_EXPORTED: 'exported',
    EXPORT_STATUS_NOT_EXPORTED: 'not_exported',
    CONFIRMATION_STATUS_CONFIRMED: 'confirmed',
    CONFIRMATION_STATUS_NOT_CONFIRMED: 'not_confirmed'
})

export const ERROR_MESSAGE = {
    AMOUNT_NOT_CORRECT: 'amount not correct',
    INVALID_ORDER: 'order is invalid',
    INVALID_PARAMS: 'invalid request params',
    INVALID_BASKET: 'invalid basket',
    PAYMENT_NOT_SUCCESSFUL: 'payment was not successful',
    INVALID_BILLING_ADDRESS: 'invalid billing address',
    INVALID_SHIPPING_ADDRESS: 'invalid shipping address',
    UNAUTHORIZED: 'unauthorized',
    ORDER_ALREADY_EXISTS: 'order already exists',
    ORDER_NOT_FOUND: 'order not found',
    PAYMENTS_DETAILS_NOT_SUCCESSFUL: 'payments details call not successful'
}

export const ADYEN_LIVE_REGIONS = {
    LIVE_EU: 'live',
    LIVE_APSE: 'live-apse',
    LIVE_AU: 'live-au',
    LIVE_US: 'live-us',
    LIVE_IN: 'live-in'
}

export const ADYEN_ENVIRONMENT = {
    LIVE: 'LIVE',
    TEST: 'TEST'
}

export const APPLICATION_VERSION = '3.0.0'