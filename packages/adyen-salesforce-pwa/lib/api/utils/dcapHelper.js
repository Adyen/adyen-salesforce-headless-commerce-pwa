import {PAYMENT_METHOD_TYPES, SHOPPER_INTERACTIONS} from '../../utils/constants.mjs'
import Logger from '../models/logger.js'

const PLACEHOLDER_VALUES = new Set(['N/A', 'ZZ'])
const REQUIRED_BILLING_FIELDS = [
    'city',
    'country',
    'houseNumberOrName',
    'postalCode',
    'stateOrProvince',
    'street'
]

export function hasDcapValue(value) {
    if (value === null || value === undefined) {
        return false
    }
    const normalizedValue = String(value).trim()
    return normalizedValue.length > 0 && !PLACEHOLDER_VALUES.has(normalizedValue.toUpperCase())
}

function isDcapEligible(paymentRequest) {
    const billingCountry = paymentRequest?.billingAddress?.country || paymentRequest?.countryCode
    return (
        paymentRequest?.shopperInteraction === SHOPPER_INTERACTIONS.ECOMMERCE &&
        paymentRequest?.paymentMethod?.type === PAYMENT_METHOD_TYPES.CREDIT_CARD &&
        typeof billingCountry === 'string' &&
        billingCountry.toUpperCase() === 'US'
    )
}

export function getMissingDcapFields(paymentRequest) {
    if (!isDcapEligible(paymentRequest)) {
        return []
    }

    const missingFields = []
    if (!hasDcapValue(paymentRequest.shopperIP)) {
        missingFields.push('shopperIP')
    }
    if (!hasDcapValue(paymentRequest.shopperEmail)) {
        missingFields.push('shopperEmail')
    }
    REQUIRED_BILLING_FIELDS.forEach((fieldName) => {
        if (!hasDcapValue(paymentRequest.billingAddress?.[fieldName])) {
            missingFields.push(`billingAddress.${fieldName}`)
        }
    })
    if (
        !hasDcapValue(paymentRequest.deviceFingerprint) &&
        !hasDcapValue(paymentRequest.riskData?.clientData)
    ) {
        missingFields.push('deviceFingerprint')
    }
    return missingFields
}

export function warnForMissingDcapFields(paymentRequest) {
    const missingFields = getMissingDcapFields(paymentRequest)
    if (missingFields.length > 0) {
        Logger.warn(
            'warnForMissingDcapFields',
            `DCAP data missing for US card payment: ${missingFields.join(', ')}`
        )
    }
}
