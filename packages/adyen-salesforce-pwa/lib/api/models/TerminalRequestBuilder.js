import {TERMINAL_MESSAGE_CATEGORY, TERMINAL_REVERSAL_REASON} from '../../utils/constants.mjs'

/**
 * Generates a unique service ID for Terminal API requests.
 * @returns {string} A unique service ID string.
 */
function generateServiceId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/**
 * Builder class for constructing Adyen Terminal API request objects (SaleToPOIRequest).
 * Provides a fluent interface for building PaymentRequest, AbortRequest, and ReversalRequest.
 */
export class TerminalRequestBuilder {
    constructor() {
        this.saleToPOIRequest = {
            MessageHeader: null
        }
    }

    /**
     * Sets the MessageHeader on the SaleToPOIRequest.
     * @param {string} messageCategory - The message category (e.g. 'Payment', 'Abort', 'Reversal').
     * @param {string} poiId - The POI terminal ID.
     * @param {string} saleId - The sale system ID.
     * @param {string} [serviceId] - The service ID. Auto-generated if not provided.
     * @returns {TerminalRequestBuilder} The builder instance for chaining.
     */
    withMessageHeader(messageCategory, poiId, saleId, serviceId) {
        this.saleToPOIRequest.MessageHeader = {
            MessageType: 'Request',
            MessageClass: 'Service',
            MessageCategory: messageCategory,
            POIID: poiId,
            SaleID: saleId,
            ServiceID: serviceId || generateServiceId(),
            ProtocolVersion: '3.0'
        }
        return this
    }

    /**
     * Sets a PaymentRequest on the SaleToPOIRequest.
     * @param {number} amount - The requested payment amount.
     * @param {string} currency - The ISO 4217 currency code.
     * @param {string} reference - The sale transaction reference/order number.
     * @param {string} [timestamp] - ISO timestamp for SaleTransactionID. Defaults to now.
     * @returns {TerminalRequestBuilder} The builder instance for chaining.
     */
    withPaymentRequest(amount, currency, reference, timestamp) {
        this.saleToPOIRequest.PaymentRequest = {
            SaleData: {
                SaleTransactionID: {
                    TransactionID: reference,
                    TimeStamp: timestamp || new Date().toISOString()
                }
            },
            PaymentTransaction: {
                AmountsReq: {
                    Currency: currency,
                    RequestedAmount: amount
                }
            }
        }
        return this
    }

    /**
     * Sets an AbortRequest on the SaleToPOIRequest.
     * @param {string} abortReason - The reason for aborting.
     * @param {string} serviceId - The ServiceID of the request to abort.
     * @param {string} [messageCategory='Payment'] - The message category of the request to abort.
     * @returns {TerminalRequestBuilder} The builder instance for chaining.
     */
    withAbortRequest(abortReason, serviceId, messageCategory = TERMINAL_MESSAGE_CATEGORY.PAYMENT) {
        this.saleToPOIRequest.AbortRequest = {
            AbortReason: abortReason,
            MessageReference: {
                MessageCategory: messageCategory,
                ServiceID: serviceId,
                POIID: this.saleToPOIRequest.MessageHeader?.POIID,
                SaleID: this.saleToPOIRequest.MessageHeader?.SaleID
            }
        }
        return this
    }

    /**
     * Sets a ReversalRequest on the SaleToPOIRequest.
     * @param {object} originalPoiTransaction - The OriginalPOITransaction identifying the transaction to reverse.
     * @param {string} [reversalReason='MerchantCancel'] - The reason for the reversal.
     * @param {number} [reversedAmount] - The amount to reverse. Omit to reverse the full amount.
     * @returns {TerminalRequestBuilder} The builder instance for chaining.
     */
    withReversalRequest(
        originalPoiTransaction,
        reversalReason = TERMINAL_REVERSAL_REASON.MERCHANT_CANCEL,
        reversedAmount
    ) {
        const reversalRequest = {
            OriginalPOITransaction: originalPoiTransaction,
            ReversalReason: reversalReason
        }
        if (reversedAmount !== undefined) {
            reversalRequest.ReversedAmount = reversedAmount
        }
        this.saleToPOIRequest.ReversalRequest = reversalRequest
        return this
    }

    /**
     * Builds and returns the final TerminalApiRequest object.
     * @returns {object} The constructed TerminalApiRequest with SaleToPOIRequest.
     */
    build() {
        return {SaleToPOIRequest: this.saleToPOIRequest}
    }

    /**
     * Creates a payment request for the Terminal API.
     * @param {string} poiId - The POI terminal ID.
     * @param {string} saleId - The sale system ID.
     * @param {number} amount - The requested payment amount.
     * @param {string} currency - The ISO 4217 currency code.
     * @param {string} reference - The sale transaction reference/order number.
     * @returns {object} A TerminalApiRequest with a PaymentRequest.
     */
    static createPayment(poiId, saleId, amount, currency, reference) {
        return new TerminalRequestBuilder()
            .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.PAYMENT, poiId, saleId)
            .withPaymentRequest(amount, currency, reference)
            .build()
    }

    /**
     * Creates an abort request for the Terminal API.
     * @param {string} poiId - The POI terminal ID.
     * @param {string} saleId - The sale system ID.
     * @param {string} abortReason - The reason for aborting.
     * @param {string} originalServiceId - The ServiceID of the request to abort.
     * @returns {object} A TerminalApiRequest with an AbortRequest.
     */
    static createAbort(poiId, saleId, abortReason, originalServiceId) {
        return new TerminalRequestBuilder()
            .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.ABORT, poiId, saleId)
            .withAbortRequest(abortReason, originalServiceId)
            .build()
    }

    /**
     * Creates a reversal request for the Terminal API.
     * @param {string} poiId - The POI terminal ID.
     * @param {string} saleId - The sale system ID.
     * @param {object} originalPoiTransaction - The OriginalPOITransaction identifying the transaction to reverse.
     * @param {string} [reversalReason='MerchantCancel'] - The reason for the reversal.
     * @param {number} [reversedAmount] - The amount to reverse. Omit to reverse the full amount.
     * @returns {object} A TerminalApiRequest with a ReversalRequest.
     */
    static createReversal(
        poiId,
        saleId,
        originalPoiTransaction,
        reversalReason = TERMINAL_REVERSAL_REASON.MERCHANT_CANCEL,
        reversedAmount
    ) {
        return new TerminalRequestBuilder()
            .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.REVERSAL, poiId, saleId)
            .withReversalRequest(originalPoiTransaction, reversalReason, reversedAmount)
            .build()
    }
}
