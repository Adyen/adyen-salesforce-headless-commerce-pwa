import {
    generateServiceId,
    buildMessageHeader,
    buildSaleToAcquirerData,
    parsePaymentResponse
} from '../terminalHelper'
import {POS} from '../../../utils/constants.mjs'

describe('terminalHelper', () => {
    describe('generateServiceId', () => {
        it('should return a string of length 10', () => {
            const serviceId = generateServiceId()
            expect(serviceId).toHaveLength(10)
        })

        it('should return a numeric string', () => {
            const serviceId = generateServiceId()
            expect(/^\d+$/.test(serviceId)).toBe(true)
        })
    })

    describe('buildMessageHeader', () => {
        it('should build a correct payment message header', () => {
            const header = buildMessageHeader({
                messageCategory: POS.MESSAGE_CATEGORY.PAYMENT,
                serviceId: '1234567890',
                terminalId: 'V400m-123456789'
            })

            expect(header).toEqual({
                ProtocolVersion: '3.0',
                MessageClass: 'Service',
                MessageCategory: 'Payment',
                MessageType: 'Request',
                ServiceID: '1234567890',
                SaleID: 'SalesforceCommerceCloud',
                POIID: 'V400m-123456789'
            })
        })

        it('should build a correct abort message header', () => {
            const header = buildMessageHeader({
                messageCategory: POS.MESSAGE_CATEGORY.ABORT,
                serviceId: '0987654321',
                terminalId: 'V400m-123456789'
            })

            expect(header.MessageCategory).toBe('Abort')
        })
    })

    describe('buildSaleToAcquirerData', () => {
        it('should return a base64-encoded string containing applicationInfo', () => {
            const adyenConfig = {systemIntegratorName: 'TestIntegrator'}
            const result = buildSaleToAcquirerData(adyenConfig)

            const decoded = JSON.parse(Buffer.from(result, 'base64').toString('utf-8'))
            expect(decoded.applicationInfo).toBeDefined()
            expect(decoded.applicationInfo.merchantApplication.name).toBe(
                'adyen-salesforce-commerce-cloud'
            )
            expect(decoded.applicationInfo.externalPlatform.integrator).toBe('TestIntegrator')
        })
    })

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
