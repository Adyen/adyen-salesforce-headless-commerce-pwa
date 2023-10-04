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

export const APPLICATION_VERSION = '1.0.0'
