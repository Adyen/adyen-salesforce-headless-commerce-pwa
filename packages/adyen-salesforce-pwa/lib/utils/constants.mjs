export const PAYMENT_METHODS = {
    ADYEN_COMPONENT: 'AdyenComponent',
    CREDIT_CARD: 'CREDIT_CARD'
}

export const PAYMENT_METHOD_TYPES = {
    GIFT_CARD: 'giftcard'
}

export const RESULT_CODES = {
    AUTHORISED: 'Authorised',
    CANCELLED: 'Cancelled',
    CHALLENGESHOPPER: 'ChallengeShopper',
    ERROR: 'Error',
    IDENTIFYSHOPPER: 'IdentifyShopper',
    PENDING: 'Pending',
    PRESENTTOSHOPPER: 'PresentToShopper',
    RECEIVED: 'Received',
    REDIRECTSHOPPER: 'RedirectShopper',
    REFUSED: 'Refused',
}

export const BLOCKED_PAYMENT_METHODS = [PAYMENT_METHOD_TYPES.GIFT_CARD]

export const SHOPPER_INTERACTIONS = {
    CONT_AUTH: 'ContAuth',
    ECOMMERCE: 'Ecommerce',
};

export const RECURRING_PROCESSING_MODEL = {
    CARD_ON_FILE: 'CardOnFile',
};

export const ORDER = Object.freeze({
    ORDER_STATUS_CREATED: 'created',
    ORDER_STATUS_NEW: 'new',
    ORDER_STATUS_COMPLETED: 'completed',
    ORDER_STATUS_CANCELED: 'cancelled',
    ORDER_STATUS_FAILED: 'failed',
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

export const APPLICATION_VERSION = '1.0.0-beta.0'
