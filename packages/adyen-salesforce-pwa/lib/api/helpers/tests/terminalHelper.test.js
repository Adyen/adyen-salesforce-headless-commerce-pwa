import {parsePaymentResponse} from '../terminalHelper'

describe('terminalHelper', () => {
    describe('parsePaymentResponse', () => {
        it('should parse a successful payment response', () => {
            const additionalData = {
                additionalData: {
                    paymentMethod: 'visa',
                    paymentMethodVariant: 'visadebit'
                },
                message: 'Approved',
                refusalReason: null
            }
            const additionalResponseBase64 = Buffer.from(JSON.stringify(additionalData)).toString(
                'base64'
            )

            const terminalResponse = {
                SaleToPOIResponse: {
                    PaymentResponse: {
                        POIData: {
                            POITransactionID: {
                                TransactionID: 'oLkO001234567890123.ABCDEF1234567890'
                            }
                        },
                        PaymentResult: {
                            PaymentInstrumentData: {
                                PaymentInstrumentType: 'Card'
                            }
                        },
                        Response: {
                            Result: 'Success',
                            ErrorCondition: undefined,
                            AdditionalResponse: additionalResponseBase64
                        }
                    }
                }
            }

            const result = parsePaymentResponse(terminalResponse)

            expect(result.pspReference).toBe('ABCDEF1234567890')
            expect(result.paymentMethod).toBe('visa')
            expect(result.paymentMethodVariant).toBe('visadebit')
            expect(result.paymentInstrumentType).toBe('Card')
            expect(result.result).toBe('Success')
        })

        it('should handle a failed payment response', () => {
            const additionalData = {
                additionalData: {},
                message: 'Transaction declined',
                refusalReason: 'Refused'
            }
            const additionalResponseBase64 = Buffer.from(JSON.stringify(additionalData)).toString(
                'base64'
            )

            const terminalResponse = {
                SaleToPOIResponse: {
                    PaymentResponse: {
                        POIData: {
                            POITransactionID: {
                                TransactionID: 'oLkO001234567890123.FAIL123'
                            }
                        },
                        PaymentResult: {
                            PaymentInstrumentData: {
                                PaymentInstrumentType: 'Card'
                            }
                        },
                        Response: {
                            Result: 'Failure',
                            ErrorCondition: 'Refusal',
                            AdditionalResponse: additionalResponseBase64
                        }
                    }
                }
            }

            const result = parsePaymentResponse(terminalResponse)

            expect(result.result).toBe('Failure')
            expect(result.error.errorCondition).toBe('Refusal')
            expect(result.error.refusalReason).toBe('Refused')
        })

        it('should handle response without additionalResponse', () => {
            const terminalResponse = {
                SaleToPOIResponse: {
                    PaymentResponse: {
                        POIData: {
                            POITransactionID: {
                                TransactionID: 'oLkO001234567890123.PSP123'
                            }
                        },
                        PaymentResult: {
                            PaymentInstrumentData: {
                                PaymentInstrumentType: 'Card'
                            }
                        },
                        Response: {
                            Result: 'Success'
                        }
                    }
                }
            }

            const result = parsePaymentResponse(terminalResponse)

            expect(result.result).toBe('Success')
            expect(result.pspReference).toBe('PSP123')
            expect(result.paymentMethod).toBeUndefined()
        })

        it('should handle invalid base64 additionalResponse gracefully', () => {
            const terminalResponse = {
                SaleToPOIResponse: {
                    PaymentResponse: {
                        POIData: {
                            POITransactionID: {
                                TransactionID: 'oLkO001234567890123.PSP456'
                            }
                        },
                        PaymentResult: {},
                        Response: {
                            Result: 'Success',
                            AdditionalResponse: '!!!invalid-base64-json!!!'
                        }
                    }
                }
            }

            const result = parsePaymentResponse(terminalResponse)

            expect(result.result).toBe('Success')
            expect(result.pspReference).toBe('PSP456')
            expect(result.paymentMethod).toBeUndefined()
        })

        it('should handle missing transactionId', () => {
            const terminalResponse = {
                SaleToPOIResponse: {
                    PaymentResponse: {
                        POIData: {},
                        PaymentResult: {},
                        Response: {
                            Result: 'Failure',
                            ErrorCondition: 'Cancel'
                        }
                    }
                }
            }

            const result = parsePaymentResponse(terminalResponse)

            expect(result.result).toBe('Failure')
            expect(result.pspReference).toBeUndefined()
        })

        it('should handle missing PaymentResponse', () => {
            const result = parsePaymentResponse({SaleToPOIResponse: {}})

            expect(result.result).toBe('Failure')
            expect(result.error.message).toBe('No PaymentResponse in terminal response')
        })

        it('should handle null terminal response', () => {
            const result = parsePaymentResponse(null)

            expect(result.result).toBe('Failure')
        })
    })
})
