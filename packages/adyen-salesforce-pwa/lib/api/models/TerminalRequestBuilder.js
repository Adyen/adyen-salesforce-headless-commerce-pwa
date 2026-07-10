import {TERMINAL_MESSAGE_CATEGORY, TERMINAL_REVERSAL_REASON} from '../../utils/constants.mjs'
import {generateServiceId} from '../../utils/generateServiceId.mjs'
import {getApplicationInfo} from '../../utils/getApplicationInfo.mjs'

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

    _clearRequestTypes() {
        delete this.saleToPOIRequest.PaymentRequest
        delete this.saleToPOIRequest.AbortRequest
        delete this.saleToPOIRequest.ReversalRequest
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
        this._clearRequestTypes()
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
     * Sets the SaleReferenceID on an existing PaymentRequest's SaleData.
     * Must be called after withPaymentRequest.
     * @param {string} referenceId - The sale reference identifier.
     * @returns {TerminalRequestBuilder} The builder instance for chaining.
     */
    withSaleReferenceId(referenceId) {
        if (this.saleToPOIRequest.PaymentRequest?.SaleData) {
            this.saleToPOIRequest.PaymentRequest.SaleData.SaleReferenceID = referenceId
        }
        return this
    }

    /**
     * Sets the SaleToAcquirerData on an existing PaymentRequest's SaleData.
     * Encodes applicationInfo from the provided Adyen config as base64.
     * Must be called after withPaymentRequest.
     * @param {object} adyenConfig - The Adyen configuration object.
     * @returns {TerminalRequestBuilder} The builder instance for chaining.
     */
    withSaleToAcquirerData(adyenConfig) {
        if (this.saleToPOIRequest.PaymentRequest?.SaleData) {
            const applicationInfoObject = {
                applicationInfo: getApplicationInfo(adyenConfig.systemIntegratorName)
            }
            this.saleToPOIRequest.PaymentRequest.SaleData.SaleToAcquirerData = Buffer.from(
                JSON.stringify(applicationInfoObject)
            ).toString('base64')
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
        this._clearRequestTypes()
        this.saleToPOIRequest.AbortRequest = {
            AbortReason: abortReason,
            MessageReference: {
                MessageCategory: messageCategory,
                ServiceID: serviceId
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
        this._clearRequestTypes()
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
        if (this.saleToPOIRequest.AbortRequest && this.saleToPOIRequest.MessageHeader) {
            this.saleToPOIRequest.AbortRequest.MessageReference.POIID =
                this.saleToPOIRequest.MessageHeader.POIID
            this.saleToPOIRequest.AbortRequest.MessageReference.SaleID =
                this.saleToPOIRequest.MessageHeader.SaleID
        }
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
