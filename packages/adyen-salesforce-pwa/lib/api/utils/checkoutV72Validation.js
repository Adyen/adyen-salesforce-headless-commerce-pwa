import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'

/**
 * Validates shopper email format according to Checkout API v72 requirements.
 * Must not contain spaces, must have exactly one '@' with text on both sides,
 * domain must not start with '.', and must be ≤ 256 characters.
 * @param {string} email - The email address to validate.
 * @throws {AdyenError} If the email format is invalid.
 * @private
 */
function validateShopperEmail(email) {
    if (!email) {
        return
    }

    if (email.length > 256) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }

    if (email.includes(' ')) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }

    const atIndex = email.indexOf('@')
    if (atIndex === -1 || atIndex !== email.lastIndexOf('@')) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }

    if (atIndex === 0 || atIndex === email.length - 1) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }

    const domain = email.substring(atIndex + 1)
    if (domain.startsWith('.')) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }
}

/**
 * Validates date of birth format according to Checkout API v72 requirements.
 * Must match ISO-8601 format: YYYY-MM-DD.
 * @param {string} dateOfBirth - The date of birth to validate.
 * @throws {AdyenError} If the date format is invalid.
 * @private
 */
function validateDateOfBirth(dateOfBirth) {
    if (!dateOfBirth) {
        return
    }

    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}$/
    if (!iso8601Pattern.test(dateOfBirth)) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_DATE_OF_BIRTH, 400)
    }
}

/**
 * Validates entity type according to Checkout API v72 requirements.
 * Must be one of: 'NaturalPerson' or 'CompanyName'.
 * @param {string} entityType - The entity type to validate.
 * @throws {AdyenError} If the entity type is invalid.
 * @private
 */
function validateEntityType(entityType) {
    if (!entityType) {
        return
    }

    const validEntityTypes = ['NaturalPerson', 'CompanyName']
    if (!validEntityTypes.includes(entityType)) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_ENTITY_TYPE, 400)
    }
}

/**
 * Truncates a string to the specified maximum length.
 * @param {string} value - The string to truncate.
 * @param {number} maxLength - The maximum allowed length.
 * @returns {string} The truncated string.
 * @private
 */
function truncate(value, maxLength) {
    if (!value || typeof value !== 'string') {
        return value
    }
    return value.length > maxLength ? value.substring(0, maxLength) : value
}

/**
 * Encodes non-ASCII characters in a URL and truncates to maximum length.
 * @param {string} url - The URL to encode and truncate.
 * @param {number} maxLength - The maximum allowed length.
 * @returns {string} The encoded and truncated URL.
 * @private
 */
function encodeAndTruncateUrl(url, maxLength) {
    if (!url || typeof url !== 'string') {
        return url
    }

    // Encode non-ASCII characters
    // eslint-disable-next-line no-control-regex
    const encoded = url.replace(/[^\x00-\x7F]/g, (char) => encodeURIComponent(char))
    return truncate(encoded, maxLength)
}

/**
 * Formats an address object according to Checkout API v72 requirements.
 * Truncates postalCode to 10 characters and stateOrProvince to 10 characters.
 * @param {object} address - The address object to format.
 * @returns {object} The formatted address object.
 * @private
 */
function formatAddress(address) {
    if (!address || typeof address !== 'object') {
        return address
    }

    const formatted = {...address}

    if (formatted.postalCode) {
        formatted.postalCode = truncate(formatted.postalCode, 10)
    }

    if (formatted.stateOrProvince) {
        formatted.stateOrProvince = truncate(formatted.stateOrProvince, 10)
    }

    return formatted
}

/**
 * Formats a delivery address object according to Checkout API v72 requirements.
 * Truncates postalCode to 10 characters and uppercases/truncates stateOrProvince to 2 characters.
 * @param {object} address - The delivery address object to format.
 * @returns {object} The formatted delivery address object.
 * @private
 */
function formatDeliveryAddress(address) {
    if (!address || typeof address !== 'object') {
        return address
    }

    const formatted = {...address}

    if (formatted.postalCode) {
        formatted.postalCode = truncate(formatted.postalCode, 10)
    }

    if (formatted.stateOrProvince) {
        formatted.stateOrProvince = truncate(formatted.stateOrProvince.toUpperCase(), 2)
    }

    return formatted
}

/**
 * Formats shopper name according to Checkout API v72 requirements.
 * Truncates firstName and lastName to 100 characters each.
 * @param {object} shopperName - The shopper name object to format.
 * @returns {object} The formatted shopper name object.
 * @private
 */
function formatShopperName(shopperName) {
    if (!shopperName || typeof shopperName !== 'object') {
        return shopperName
    }

    const formatted = {...shopperName}

    if (formatted.firstName) {
        formatted.firstName = truncate(formatted.firstName, 100)
    }

    if (formatted.lastName) {
        formatted.lastName = truncate(formatted.lastName, 100)
    }

    return formatted
}

/**
 * Formats metadata according to Checkout API v72 requirements.
 * Truncates keys to 20 characters and values to 80 characters.
 * @param {object} metadata - The metadata object to format.
 * @returns {object} The formatted metadata object.
 * @private
 */
function formatMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return metadata
    }

    const formatted = {}
    for (const [key, value] of Object.entries(metadata)) {
        const truncatedKey = truncate(key, 20)
        const truncatedValue = typeof value === 'string' ? truncate(value, 80) : value
        formatted[truncatedKey] = truncatedValue
    }

    return formatted
}

/**
 * Formats and validates a payment request according to Checkout API v72 requirements.
 * Silently truncates/normalizes length-limited fields and throws AdyenError for invalid hard-format fields.
 * @param {object} paymentRequest - The payment request object to format and validate.
 * @returns {object} The formatted and validated payment request object.
 * @throws {AdyenError} If any hard-format validation fails (shopperEmail, dateOfBirth, entityType).
 */
export function formatAndValidatePaymentRequest(paymentRequest) {
    if (!paymentRequest || typeof paymentRequest !== 'object') {
        return paymentRequest
    }

    // Validate hard-format fields first (these throw on failure)
    validateShopperEmail(paymentRequest.shopperEmail)
    validateDateOfBirth(paymentRequest.dateOfBirth)
    validateEntityType(paymentRequest.entityType)

    // Create a shallow copy to avoid mutating the original
    const formatted = {...paymentRequest}

    // Format length-limited fields (silently truncate/normalize)
    if (formatted.reference) {
        formatted.reference = truncate(formatted.reference, 80)
    }

    if (formatted.shopperIP) {
        formatted.shopperIP = truncate(formatted.shopperIP, 256)
    }

    if (formatted.telephoneNumber) {
        formatted.telephoneNumber = truncate(formatted.telephoneNumber, 64)
    }

    if (formatted.socialSecurityNumber) {
        formatted.socialSecurityNumber = truncate(formatted.socialSecurityNumber, 50)
    }

    if (formatted.shopperName) {
        formatted.shopperName = formatShopperName(formatted.shopperName)
    }

    if (formatted.billingAddress) {
        formatted.billingAddress = formatAddress(formatted.billingAddress)
    }

    if (formatted.deliveryAddress) {
        formatted.deliveryAddress = formatDeliveryAddress(formatted.deliveryAddress)
    }

    if (formatted.returnUrl) {
        formatted.returnUrl = encodeAndTruncateUrl(formatted.returnUrl, 1024)
    }

    if (formatted.metadata) {
        formatted.metadata = formatMetadata(formatted.metadata)
    }

    if (formatted.captureDelayHours !== undefined && formatted.captureDelayHours > 672) {
        formatted.captureDelayHours = 672
    }

    return formatted
}
