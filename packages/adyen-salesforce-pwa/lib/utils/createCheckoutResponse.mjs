import {RESULT_CODES} from './constants.mjs'

const ACTION_CODES = new Set([
    RESULT_CODES.REDIRECT_SHOPPER,
    RESULT_CODES.IDENTIFY_SHOPPER,
    RESULT_CODES.CHALLENGE_SHOPPER,
    RESULT_CODES.PENDING,
    RESULT_CODES.PRESENT_TO_SHOPPER
])

const SUCCESSFUL_CODES = new Set([RESULT_CODES.AUTHORISED, RESULT_CODES.RECEIVED])
const FAILURE_CODES = new Set([RESULT_CODES.REFUSED, RESULT_CODES.ERROR, RESULT_CODES.CANCELLED])

export function createCheckoutResponse(response, orderNumber) {
    const {resultCode, action, order} = response
    const merchantReference = response.merchantReference || orderNumber
    if (FAILURE_CODES.has(resultCode)) {
        return {
            isFinal: true,
            isSuccessful: false,
            merchantReference,
            refusalReason: response.refusalReason
        }
    }
    if (ACTION_CODES.has(resultCode)) {
        return {
            isFinal: false,
            isSuccessful: true,
            action,
            merchantReference
        }
    }
    const isFinal = order ? order.remainingAmount.value <= 0 : true
    return {
        isFinal,
        isSuccessful: SUCCESSFUL_CODES.has(resultCode),
        merchantReference
    }
}
