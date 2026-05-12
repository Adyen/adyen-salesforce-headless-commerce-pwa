import {POS} from '../../utils/constants.mjs'
import {getApplicationInfo} from '../../utils/getApplicationInfo.mjs'

/**
 * Generates a unique service ID for Terminal API requests.
 * Uses the last 10 characters of the current timestamp.
 * @returns {string} A unique service ID string.
 */
export function generateServiceId() {
    const dateString = Date.now().toString()
    return dateString.slice(-10)
}

/**
 * Builds the MessageHeader object for a SaleToPOI request.
 * @param {object} options - The header options.
 * @param {string} options.messageCategory - The message category (e.g., 'Payment', 'Abort').
 * @param {string} options.serviceId - The unique service ID.
 * @param {string} options.terminalId - The POIID (terminal identifier).
 * @returns {object} The MessageHeader object.
 */
export function buildMessageHeader({messageCategory, serviceId, terminalId}) {
    return {
        ProtocolVersion: POS.PROTOCOL_VERSION,
        MessageClass: POS.MESSAGE_CLASS.SERVICE,
        MessageCategory: messageCategory,
        MessageType: POS.MESSAGE_TYPE.REQUEST,
        ServiceID: serviceId,
        SaleID: POS.SALE_ID,
        POIID: terminalId
    }
}

/**
 * Builds the base64-encoded SaleToAcquirerData containing applicationInfo.
 * @param {object} adyenConfig - The Adyen configuration object.
 * @returns {string} Base64-encoded JSON string with applicationInfo.
 */
export function buildSaleToAcquirerData(adyenConfig) {
    const applicationInfoObject = {
        applicationInfo: getApplicationInfo(adyenConfig.systemIntegratorName)
    }
    return Buffer.from(JSON.stringify(applicationInfoObject)).toString('base64')
}

/**
 * Parses the SaleToPOIResponse from a terminal payment call.
 * Extracts pspReference, payment method details, result, and any error information.
 * @param {object} terminalResponse - The raw SaleToPOIResponse object.
 * @returns {object} Parsed payment response with pspReference, paymentMethod, result, and error.
 */
export function parsePaymentResponse(terminalResponse) {
    const paymentResponse = terminalResponse?.SaleToPOIResponse?.PaymentResponse

    if (!paymentResponse) {
        return {
            result: 'Failure',
            error: {message: 'No PaymentResponse in terminal response'}
        }
    }

    const transactionId = paymentResponse?.POIData?.POITransactionID?.TransactionID
    const pspReference = transactionId ? transactionId.split('.').pop() : undefined

    const paymentInstrumentType =
        paymentResponse?.PaymentResult?.PaymentInstrumentData?.PaymentInstrumentType

    const response = paymentResponse?.Response || {}
    const {
        Result: result,
        ErrorCondition: errorCondition,
        AdditionalResponse: additionalResponse
    } = response

    let paymentMethod
    let paymentMethodVariant
    let message
    let refusalReason

    if (additionalResponse) {
        try {
            const decoded = JSON.parse(Buffer.from(additionalResponse, 'base64').toString('utf-8'))
            paymentMethod = decoded?.additionalData?.paymentMethod
            paymentMethodVariant = decoded?.additionalData?.paymentMethodVariant
            message = decoded?.message
            refusalReason = decoded?.refusalReason
        } catch {
            // If decoding fails, continue without additional data
        }
    }

    return {
        pspReference,
        paymentMethod,
        paymentMethodVariant,
        paymentInstrumentType,
        result,
        error: {
            errorCondition,
            message,
            refusalReason
        }
    }
}
