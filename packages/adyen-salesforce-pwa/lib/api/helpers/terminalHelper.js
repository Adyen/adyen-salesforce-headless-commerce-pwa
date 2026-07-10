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
