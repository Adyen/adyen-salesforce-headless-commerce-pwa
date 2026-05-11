import {TerminalRequestBuilder} from '../TerminalRequestBuilder.js'
import {TERMINAL_MESSAGE_CATEGORY, TERMINAL_REVERSAL_REASON} from '../../../utils/constants.mjs'

describe('TerminalRequestBuilder', () => {
    const poiId = 'P400Plus-123456789'
    const saleId = 'SalesSystem001'
    const amount = 100.0
    const currency = 'EUR'
    const reference = 'ORDER-123'

    describe('withMessageHeader', () => {
        it('sets the MessageHeader with required fields', () => {
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.PAYMENT, poiId, saleId)
                .build()

            const header = request.SaleToPOIRequest.MessageHeader
            expect(header.MessageType).toBe('Request')
            expect(header.MessageClass).toBe('Service')
            expect(header.MessageCategory).toBe('Payment')
            expect(header.POIID).toBe(poiId)
            expect(header.SaleID).toBe(saleId)
            expect(header.ProtocolVersion).toBe('3.0')
            expect(header.ServiceID).toBeDefined()
            expect(typeof header.ServiceID).toBe('string')
        })

        it('uses a provided serviceId instead of generating one', () => {
            const customServiceId = 'custom-service-id'
            const request = new TerminalRequestBuilder()
                .withMessageHeader(
                    TERMINAL_MESSAGE_CATEGORY.PAYMENT,
                    poiId,
                    saleId,
                    customServiceId
                )
                .build()

            expect(request.SaleToPOIRequest.MessageHeader.ServiceID).toBe(customServiceId)
        })

        it('generates unique ServiceIDs for different instances', () => {
            const id1 = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.PAYMENT, poiId, saleId)
                .build().SaleToPOIRequest.MessageHeader.ServiceID

            const id2 = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.PAYMENT, poiId, saleId)
                .build().SaleToPOIRequest.MessageHeader.ServiceID

            expect(id1).not.toBe(id2)
        })
    })

    describe('withPaymentRequest', () => {
        it('builds a valid PaymentRequest', () => {
            const timestamp = '2026-01-01T12:00:00.000Z'
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.PAYMENT, poiId, saleId)
                .withPaymentRequest(amount, currency, reference, timestamp)
                .build()

            const paymentReq = request.SaleToPOIRequest.PaymentRequest
            expect(paymentReq).toBeDefined()
            expect(paymentReq.SaleData.SaleTransactionID.TransactionID).toBe(reference)
            expect(paymentReq.SaleData.SaleTransactionID.TimeStamp).toBe(timestamp)
            expect(paymentReq.PaymentTransaction.AmountsReq.Currency).toBe(currency)
            expect(paymentReq.PaymentTransaction.AmountsReq.RequestedAmount).toBe(amount)
        })

        it('uses current timestamp if not provided', () => {
            const before = new Date().toISOString()
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.PAYMENT, poiId, saleId)
                .withPaymentRequest(amount, currency, reference)
                .build()

            const timestamp =
                request.SaleToPOIRequest.PaymentRequest.SaleData.SaleTransactionID.TimeStamp
            expect(timestamp >= before).toBe(true)
        })
    })

    describe('withAbortRequest', () => {
        it('builds a valid AbortRequest', () => {
            const abortReason = 'UserCancelled'
            const originalServiceId = 'service-to-abort'

            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.ABORT, poiId, saleId)
                .withAbortRequest(abortReason, originalServiceId)
                .build()

            const abortReq = request.SaleToPOIRequest.AbortRequest
            expect(abortReq).toBeDefined()
            expect(abortReq.AbortReason).toBe(abortReason)
            expect(abortReq.MessageReference.ServiceID).toBe(originalServiceId)
            expect(abortReq.MessageReference.MessageCategory).toBe(
                TERMINAL_MESSAGE_CATEGORY.PAYMENT
            )
            expect(abortReq.MessageReference.POIID).toBe(poiId)
            expect(abortReq.MessageReference.SaleID).toBe(saleId)
        })

        it('uses a custom messageCategory for the MessageReference', () => {
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.ABORT, poiId, saleId)
                .withAbortRequest('reason', 'sid', TERMINAL_MESSAGE_CATEGORY.REVERSAL)
                .build()

            expect(request.SaleToPOIRequest.AbortRequest.MessageReference.MessageCategory).toBe(
                TERMINAL_MESSAGE_CATEGORY.REVERSAL
            )
        })
    })

    describe('withReversalRequest', () => {
        const originalPoiTransaction = {
            POIID: poiId,
            SaleID: saleId,
            POITransactionID: {TransactionID: 'txn-001', TimeStamp: '2026-01-01T10:00:00.000Z'}
        }

        it('builds a valid ReversalRequest with default reason', () => {
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.REVERSAL, poiId, saleId)
                .withReversalRequest(originalPoiTransaction)
                .build()

            const reversalReq = request.SaleToPOIRequest.ReversalRequest
            expect(reversalReq).toBeDefined()
            expect(reversalReq.OriginalPOITransaction).toEqual(originalPoiTransaction)
            expect(reversalReq.ReversalReason).toBe(TERMINAL_REVERSAL_REASON.MERCHANT_CANCEL)
            expect(reversalReq.ReversedAmount).toBeUndefined()
        })

        it('includes ReversedAmount when provided', () => {
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.REVERSAL, poiId, saleId)
                .withReversalRequest(
                    originalPoiTransaction,
                    TERMINAL_REVERSAL_REASON.CUST_CANCEL,
                    50.0
                )
                .build()

            const reversalReq = request.SaleToPOIRequest.ReversalRequest
            expect(reversalReq.ReversalReason).toBe(TERMINAL_REVERSAL_REASON.CUST_CANCEL)
            expect(reversalReq.ReversedAmount).toBe(50.0)
        })

        it('does not include ReversedAmount when undefined', () => {
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.REVERSAL, poiId, saleId)
                .withReversalRequest(originalPoiTransaction, TERMINAL_REVERSAL_REASON.MALFUNCTION)
                .build()

            expect('ReversedAmount' in request.SaleToPOIRequest.ReversalRequest).toBe(false)
        })
    })

    describe('static factory methods', () => {
        describe('createPayment', () => {
            it('creates a valid payment request', () => {
                const request = TerminalRequestBuilder.createPayment(
                    poiId,
                    saleId,
                    amount,
                    currency,
                    reference
                )

                expect(request.SaleToPOIRequest.MessageHeader.MessageCategory).toBe(
                    TERMINAL_MESSAGE_CATEGORY.PAYMENT
                )
                expect(request.SaleToPOIRequest.MessageHeader.POIID).toBe(poiId)
                expect(request.SaleToPOIRequest.MessageHeader.SaleID).toBe(saleId)
                expect(
                    request.SaleToPOIRequest.PaymentRequest.PaymentTransaction.AmountsReq.Currency
                ).toBe(currency)
                expect(
                    request.SaleToPOIRequest.PaymentRequest.PaymentTransaction.AmountsReq
                        .RequestedAmount
                ).toBe(amount)
                expect(
                    request.SaleToPOIRequest.PaymentRequest.SaleData.SaleTransactionID.TransactionID
                ).toBe(reference)
            })
        })

        describe('createAbort', () => {
            it('creates a valid abort request', () => {
                const abortReason = 'UserCancelled'
                const originalServiceId = 'svc-001'

                const request = TerminalRequestBuilder.createAbort(
                    poiId,
                    saleId,
                    abortReason,
                    originalServiceId
                )

                expect(request.SaleToPOIRequest.MessageHeader.MessageCategory).toBe(
                    TERMINAL_MESSAGE_CATEGORY.ABORT
                )
                expect(request.SaleToPOIRequest.AbortRequest.AbortReason).toBe(abortReason)
                expect(request.SaleToPOIRequest.AbortRequest.MessageReference.ServiceID).toBe(
                    originalServiceId
                )
            })
        })

        describe('createReversal', () => {
            it('creates a valid reversal request with default reason', () => {
                const originalPoiTransaction = {
                    POITransactionID: {
                        TransactionID: 'txn-001',
                        TimeStamp: '2026-01-01T10:00:00.000Z'
                    }
                }

                const request = TerminalRequestBuilder.createReversal(
                    poiId,
                    saleId,
                    originalPoiTransaction
                )

                expect(request.SaleToPOIRequest.MessageHeader.MessageCategory).toBe(
                    TERMINAL_MESSAGE_CATEGORY.REVERSAL
                )
                expect(request.SaleToPOIRequest.ReversalRequest.ReversalReason).toBe(
                    TERMINAL_REVERSAL_REASON.MERCHANT_CANCEL
                )
                expect(request.SaleToPOIRequest.ReversalRequest.OriginalPOITransaction).toEqual(
                    originalPoiTransaction
                )
                expect(request.SaleToPOIRequest.ReversalRequest.ReversedAmount).toBeUndefined()
            })

            it('creates a valid reversal request with custom reason and amount', () => {
                const originalPoiTransaction = {
                    POITransactionID: {
                        TransactionID: 'txn-002',
                        TimeStamp: '2026-01-01T10:00:00.000Z'
                    }
                }

                const request = TerminalRequestBuilder.createReversal(
                    poiId,
                    saleId,
                    originalPoiTransaction,
                    TERMINAL_REVERSAL_REASON.CUST_CANCEL,
                    75.0
                )

                expect(request.SaleToPOIRequest.ReversalRequest.ReversalReason).toBe(
                    TERMINAL_REVERSAL_REASON.CUST_CANCEL
                )
                expect(request.SaleToPOIRequest.ReversalRequest.ReversedAmount).toBe(75.0)
            })
        })
    })

    describe('build', () => {
        it('returns a TerminalApiRequest shape with SaleToPOIRequest', () => {
            const request = new TerminalRequestBuilder()
                .withMessageHeader(TERMINAL_MESSAGE_CATEGORY.PAYMENT, poiId, saleId)
                .withPaymentRequest(amount, currency, reference)
                .build()

            expect(request).toHaveProperty('SaleToPOIRequest')
            expect(request.SaleToPOIRequest).toHaveProperty('MessageHeader')
            expect(request.SaleToPOIRequest).toHaveProperty('PaymentRequest')
        })
    })
})
