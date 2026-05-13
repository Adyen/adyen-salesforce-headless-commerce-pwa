import createTerminalPayment from '../terminal-payment'
import AdyenClientProvider from '../../models/adyenClientProvider'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'
import * as generateServiceIdModule from '../../../utils/generateServiceId.mjs'
import * as orderHelper from '../../helpers/orderHelper'

jest.mock('../../models/adyenClientProvider')
jest.mock('../../models/logger')
jest.mock('../../helpers/orderHelper')

describe('createTerminalPayment controller', () => {
    let req, res, next
    let mockSync, mockAddPaymentInstrument, mockRemoveAllPaymentInstruments

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(generateServiceIdModule, 'generateServiceId').mockReturnValue('1234567890')

        mockSync = jest.fn()

        AdyenClientProvider.mockImplementation(() => ({
            getTerminalClient: () => ({
                sync: mockSync
            })
        }))

        mockAddPaymentInstrument = jest.fn().mockResolvedValue({})
        mockRemoveAllPaymentInstruments = jest.fn().mockResolvedValue({})
        orderHelper.createOrderUsingOrderNo.mockResolvedValue({orderNo: 'ORDER-001'})
        orderHelper.updateOrderPaymentInstrument.mockResolvedValue({})
        orderHelper.failOrderAndReopenBasket.mockResolvedValue('new-basket-123')

        req = {
            body: {
                terminalId: 'V400m-123456789'
            }
        }

        res = {
            locals: {
                adyen: {
                    adyenConfig: {
                        merchantAccount: 'TestMerchant',
                        systemIntegratorName: 'TestIntegrator'
                    },
                    basket: {
                        basketId: 'basket-001',
                        currency: 'EUR',
                        orderTotal: 100.0,
                        c_orderNo: 'ORDER-001'
                    },
                    basketService: {
                        addPaymentInstrument: mockAddPaymentInstrument,
                        removeAllPaymentInstruments: mockRemoveAllPaymentInstruments
                    },
                    siteId: 'RefArch'
                }
            }
        }

        next = jest.fn()
    })

    it('should create a successful terminal payment with order lifecycle', async () => {
        const additionalData = {
            additionalData: {paymentMethod: 'visa', paymentMethodVariant: 'visadebit'},
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
                            TransactionID: 'test.ABCDEF123'
                        }
                    },
                    PaymentResult: {
                        PaymentInstrumentData: {
                            PaymentInstrumentType: 'Card'
                        }
                    },
                    Response: {
                        Result: 'Success',
                        AdditionalResponse: additionalResponseBase64
                    }
                }
            }
        }

        mockSync.mockResolvedValue(terminalResponse)

        await createTerminalPayment(req, res, next)

        expect(mockRemoveAllPaymentInstruments).toHaveBeenCalled()
        expect(mockAddPaymentInstrument).toHaveBeenCalledWith(
            expect.objectContaining({currency: 'EUR'}),
            {type: 'AdyenPOS'}
        )
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        expect(mockSync).toHaveBeenCalledWith(
            expect.objectContaining({
                SaleToPOIRequest: expect.objectContaining({
                    MessageHeader: expect.objectContaining({
                        MessageCategory: 'Payment',
                        POIID: 'V400m-123456789',
                        SaleID: 'SalesforceCommerceCloud'
                    }),
                    PaymentRequest: expect.objectContaining({
                        SaleData: expect.objectContaining({
                            SaleTransactionID: expect.objectContaining({
                                TransactionID: 'ORDER-001'
                            }),
                            SaleReferenceID: 'SalesforceCommerceCloudPOS',
                            SaleToAcquirerData: expect.any(String)
                        }),
                        PaymentTransaction: expect.objectContaining({
                            AmountsReq: {Currency: 'EUR', RequestedAmount: 100.0}
                        })
                    })
                })
            })
        )
        expect(orderHelper.updateOrderPaymentInstrument).toHaveBeenCalledWith(
            'ORDER-001',
            'RefArch',
            'ABCDEF123',
            expect.objectContaining({
                pspReference: 'ABCDEF123',
                adyenPaymentMethod: 'visa',
                adyen_payment__Adyen_Payment_Method: 'visa',
                Adyen_Payment_Method_Variant: 'visadebit',
                adyen_payment__Adyen_Payment_Method_Variant: 'visadebit',
                terminalId: 'V400m-123456789'
            })
        )
        expect(res.locals.response.pspReference).toBe('ABCDEF123')
        expect(res.locals.response.orderNo).toBe('ORDER-001')
        expect(res.locals.response.serviceId).toBe('1234567890')
        expect(next).toHaveBeenCalledWith()
    })

    it('should use serviceId from request body when provided', async () => {
        req.body.serviceId = 'CLIENT-SVC-ID'

        const additionalData = {additionalData: {paymentMethod: 'visa'}, message: 'OK'}
        const terminalResponse = {
            SaleToPOIResponse: {
                PaymentResponse: {
                    POIData: {POITransactionID: {TransactionID: 'test.PSP1'}},
                    PaymentResult: {PaymentInstrumentData: {PaymentInstrumentType: 'Card'}},
                    Response: {
                        Result: 'Success',
                        AdditionalResponse: Buffer.from(JSON.stringify(additionalData)).toString(
                            'base64'
                        )
                    }
                }
            }
        }
        mockSync.mockResolvedValue(terminalResponse)

        await createTerminalPayment(req, res, next)

        expect(mockSync).toHaveBeenCalledWith(
            expect.objectContaining({
                SaleToPOIRequest: expect.objectContaining({
                    MessageHeader: expect.objectContaining({
                        ServiceID: 'CLIENT-SVC-ID'
                    })
                })
            })
        )
        expect(res.locals.response.serviceId).toBe('CLIENT-SVC-ID')
    })

    it('should fail order and reopen basket on payment failure', async () => {
        const additionalData = {
            additionalData: {},
            message: 'Declined',
            refusalReason: 'Refused'
        }

        const terminalResponse = {
            SaleToPOIResponse: {
                PaymentResponse: {
                    POIData: {POITransactionID: {TransactionID: 'test.FAIL123'}},
                    PaymentResult: {PaymentInstrumentData: {PaymentInstrumentType: 'Card'}},
                    Response: {
                        Result: 'Failure',
                        ErrorCondition: 'Refusal',
                        AdditionalResponse: Buffer.from(JSON.stringify(additionalData)).toString(
                            'base64'
                        )
                    }
                }
            }
        }

        mockSync.mockResolvedValue(terminalResponse)

        await createTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith()
        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalledWith(
            res.locals.adyen,
            'ORDER-001'
        )
        expect(res.locals.response.result).toBe('Failure')
        expect(res.locals.response.error.errorCondition).toBe('Refusal')
        expect(res.locals.response.newBasketId).toBe('new-basket-123')
    })

    it('should send abort and fail order on communication error', async () => {
        mockSync.mockRejectedValueOnce(new Error('Network timeout')).mockResolvedValueOnce('ok')

        await createTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.any(Error))
        expect(mockSync).toHaveBeenCalledTimes(2)
        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalledWith(
            res.locals.adyen,
            'ORDER-001'
        )
    })

    it('should call next with error when terminalId is missing', async () => {
        req.body.terminalId = undefined

        await createTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.INVALID_PARAMS})
        )
        expect(mockSync).not.toHaveBeenCalled()
    })

    it('should call next with error when basket is missing', async () => {
        res.locals.adyen.basket = undefined

        await createTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.INVALID_BASKET})
        )
    })

    it('should call next with error when adyen context is missing', async () => {
        res.locals = {}

        await createTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND})
        )
    })
})
