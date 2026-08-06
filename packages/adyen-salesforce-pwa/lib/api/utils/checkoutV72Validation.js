import {AdyenError} from '../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'

/**
 * Field length/value limits enforced by the Checkout API v72 contract.
 * Centralized here so every truncation/validation rule below references a
 * single named source instead of a scattered magic number.
 */
const V72_FIELD_LIMITS = {
    SHOPPER_EMAIL_MAX_LENGTH: 256,
    SHOPPER_NAME_MAX_LENGTH: 100,
    ADDRESS_POSTAL_CODE_MAX_LENGTH: 10,
    ADDRESS_STATE_OR_PROVINCE_MAX_LENGTH: 10,
    DELIVERY_STATE_OR_PROVINCE_CODE_LENGTH: 2,
    METADATA_KEY_MAX_LENGTH: 20,
    METADATA_VALUE_MAX_LENGTH: 80,
    REFERENCE_MAX_LENGTH: 80,
    SHOPPER_IP_MAX_LENGTH: 256,
    TELEPHONE_NUMBER_MAX_LENGTH: 64,
    SOCIAL_SECURITY_NUMBER_MAX_LENGTH: 50,
    RETURN_URL_MAX_LENGTH: 1024,
    CAPTURE_DELAY_MAX_HOURS: 672
}

/**
 * Checks whether a local part (the segment before the last '@') is a validly
 * quoted string per RFC 5321, e.g. "a@b" in "a@b"@example.com. Quoting allows
 * otherwise-illegal characters (spaces, '@', '"') as long as the whole local
 * part is wrapped in double quotes and any interior quote is escaped ('\"').
 * @param {string} localPart - The local part to check, including any quotes.
 * @returns {boolean} True if localPart is a well-formed quoted string.
 * @private
 */
function isValidQuotedLocalPart(localPart) {
    if (localPart.length < 2 || !localPart.startsWith('"') || !localPart.endsWith('"')) {
        return false
    }

    const inner = localPart.slice(1, -1)
    for (let i = 0; i < inner.length; i++) {
        if (inner[i] === '"' && inner[i - 1] !== '\\') {
            return false
        }
    }
    return true
}

/**
 * Validates the local part (before the last '@') of a shopper email.
 * Plain local parts must not contain spaces, '@', or '"'. Local parts that do
 * contain any of those characters are only valid if fully quoted (see
 * isValidQuotedLocalPart), e.g. "a@b"@example.com.
 * @param {string} localPart - The local part to validate.
 * @returns {boolean} True if the local part is valid.
 * @private
 */
function isValidLocalPart(localPart) {
    if (!localPart.includes('"') && !localPart.includes('@') && !localPart.includes(' ')) {
        return true
    }
    return isValidQuotedLocalPart(localPart)
}

/**
 * Validates shopper email format according to Checkout API v72 requirements.
 * The domain (after the last '@') must not start with '.' or contain spaces.
 * The local part (before the last '@') must not contain spaces, '@', or '"'
 * unless it is fully quoted per RFC 5321 (see isValidLocalPart). Must be
 * ≤ 256 characters.
 * @param {string} email - The email address to validate.
 * @throws {AdyenError} If the email format is invalid.
 * @private
 */
function validateShopperEmail(email) {
    if (email === undefined || email === null || email === '') {
        return
    }

    if (typeof email !== 'string' || email.length > V72_FIELD_LIMITS.SHOPPER_EMAIL_MAX_LENGTH) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }

    // Split on the last '@': the domain never contains '@', but a quoted
    // local part legitimately may (e.g. "a@b"@example.com).
    const atIndex = email.lastIndexOf('@')
    if (atIndex <= 0 || atIndex === email.length - 1) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }

    const localPart = email.substring(0, atIndex)
    const domain = email.substring(atIndex + 1)

    if (domain.startsWith('.') || domain.includes(' ')) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_EMAIL, 400)
    }

    if (!isValidLocalPart(localPart)) {
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
 * Truncates an already percent-encoded URL to maxLength without leaving a
 * dangling/invalid escape sequence at the cut point. A naive substring can
 * land mid-escape (e.g. "...%C3%A" or "...%C3%") or mid multi-byte UTF-8
 * sequence (e.g. "...%C3" without its "%A9" continuation byte), producing a
 * malformed URL. decodeURIComponent throws on both cases, so trimming one
 * character at a time until it succeeds guarantees a well-formed result.
 * @param {string} encoded - The percent-encoded URL to truncate.
 * @param {number} maxLength - The maximum allowed length.
 * @returns {string} The truncated URL with no incomplete escape sequence.
 * @private
 */
function truncateEncodedUrl(encoded, maxLength) {
    if (encoded.length <= maxLength) {
        return encoded
    }

    let truncated = encoded.substring(0, maxLength)
    while (truncated.length > 0) {
        try {
            decodeURIComponent(truncated)
            return truncated
        } catch {
            truncated = truncated.slice(0, -1)
        }
    }
    return truncated
}

/**
 * Encodes a URL according to Checkout API v72 requirements, which require
 * encoding of non-ASCII characters as well as unsafe/reserved ASCII
 * characters like spaces, then truncates to maximum length. Uses encodeURI
 * rather than a custom regex so it also escapes spaces and other unsafe
 * ASCII (quotes, angle brackets, etc.) while preserving URL-structural
 * characters (":", "/", "?", "#", "&", "=", ...), matching RFC 2396.
 * @param {string} url - The URL to encode and truncate.
 * @param {number} maxLength - The maximum allowed length.
 * @returns {string} The encoded and truncated URL.
 * @private
 */
function encodeAndTruncateUrl(url, maxLength) {
    if (!url || typeof url !== 'string') {
        return url
    }

    const encoded = encodeURI(url)
    return truncateEncodedUrl(encoded, maxLength)
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
        formatted.postalCode = truncate(
            formatted.postalCode,
            V72_FIELD_LIMITS.ADDRESS_POSTAL_CODE_MAX_LENGTH
        )
    }

    if (formatted.stateOrProvince) {
        formatted.stateOrProvince = truncate(
            formatted.stateOrProvince,
            V72_FIELD_LIMITS.ADDRESS_STATE_OR_PROVINCE_MAX_LENGTH
        )
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
        formatted.postalCode = truncate(
            formatted.postalCode,
            V72_FIELD_LIMITS.ADDRESS_POSTAL_CODE_MAX_LENGTH
        )
    }

    // v72 expects a 2-letter ISO 3166-2 subdivision code here, not a free-text
    // region name. Truncating to 2 chars is only correct if the upstream
    // caller already supplies an ISO code (e.g. "CA"); truncating a full name
    // like "Queensland" would silently produce an incorrect code ("QU")
    // rather than a valid one. This function does not attempt to resolve
    // names to ISO codes, it only enforces the length constraint.
    if (typeof formatted.stateOrProvince === 'string' && formatted.stateOrProvince) {
        formatted.stateOrProvince = truncate(
            formatted.stateOrProvince.toUpperCase(),
            V72_FIELD_LIMITS.DELIVERY_STATE_OR_PROVINCE_CODE_LENGTH
        )
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
        formatted.firstName = truncate(
            formatted.firstName,
            V72_FIELD_LIMITS.SHOPPER_NAME_MAX_LENGTH
        )
    }

    if (formatted.lastName) {
        formatted.lastName = truncate(formatted.lastName, V72_FIELD_LIMITS.SHOPPER_NAME_MAX_LENGTH)
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
        const truncatedKey = truncate(key, V72_FIELD_LIMITS.METADATA_KEY_MAX_LENGTH)
        const truncatedValue =
            typeof value === 'string'
                ? truncate(value, V72_FIELD_LIMITS.METADATA_VALUE_MAX_LENGTH)
                : value
        formatted[truncatedKey] = truncatedValue
    }

    return formatted
}

/**
 * Creates a date-only value object that satisfies the SDK's ObjectSerializer expectations.
 * The SDK's Date/date-time serialization branch calls toISOString(), but v72 requires
 * date-only format (YYYY-MM-DD), not full datetime. This adapter returns the original
 * date string from all serialization methods.
 * @param {string} dateString - ISO-8601 date string (YYYY-MM-DD).
 * @returns {object} An adapter object with toISOString, toJSON, and toString methods.
 * @private
 */
function createDateOnlyValue(dateString) {
    return {
        toISOString: () => dateString,
        toJSON: () => dateString,
        toString: () => dateString
    }
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

    // Replace dateOfBirth string with date-only adapter for SDK serialization
    if (formatted.dateOfBirth) {
        formatted.dateOfBirth = createDateOnlyValue(formatted.dateOfBirth)
    }

    // Format length-limited fields (silently truncate/normalize)
    if (formatted.reference) {
        formatted.reference = truncate(formatted.reference, V72_FIELD_LIMITS.REFERENCE_MAX_LENGTH)
    }

    if (formatted.shopperIP) {
        formatted.shopperIP = truncate(formatted.shopperIP, V72_FIELD_LIMITS.SHOPPER_IP_MAX_LENGTH)
    }

    if (formatted.telephoneNumber) {
        formatted.telephoneNumber = truncate(
            formatted.telephoneNumber,
            V72_FIELD_LIMITS.TELEPHONE_NUMBER_MAX_LENGTH
        )
    }

    if (formatted.socialSecurityNumber) {
        formatted.socialSecurityNumber = truncate(
            formatted.socialSecurityNumber,
            V72_FIELD_LIMITS.SOCIAL_SECURITY_NUMBER_MAX_LENGTH
        )
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
        formatted.returnUrl = encodeAndTruncateUrl(
            formatted.returnUrl,
            V72_FIELD_LIMITS.RETURN_URL_MAX_LENGTH
        )
    }

    if (formatted.metadata) {
        formatted.metadata = formatMetadata(formatted.metadata)
    }

    if (
        formatted.captureDelayHours !== undefined &&
        formatted.captureDelayHours > V72_FIELD_LIMITS.CAPTURE_DELAY_MAX_HOURS
    ) {
        formatted.captureDelayHours = V72_FIELD_LIMITS.CAPTURE_DELAY_MAX_HOURS
    }

    return formatted
}
