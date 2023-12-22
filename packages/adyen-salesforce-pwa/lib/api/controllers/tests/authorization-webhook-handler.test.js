import {authorizationWebhookHandler} from '../../index'

let mockUpdateOrderPaymentTransaction = jest.fn()
let mockUpdateOrderStatus = jest.fn()
let mockUpdateOrderConfirmationStatus = jest.fn()
let mockUpdateOrderExportStatus = jest.fn()
let mockUpdateOrderPaymentStatus = jest.fn()

jest.mock('../orderApi', () => {
    return {
        OrderApiClient: jest.fn().mockImplementation(() => {
            return {
                updateOrderPaymentTransaction: mockUpdateOrderPaymentTransaction,
                updateOrderStatus: mockUpdateOrderStatus,
                updateOrderConfirmationStatus: mockUpdateOrderConfirmationStatus,
                updateOrderExportStatus: mockUpdateOrderExportStatus,
                updateOrderPaymentStatus: mockUpdateOrderPaymentStatus
            }
        })
    }
})
describe('authorizationWebhookHandler', () => {
    let req, res, next, consoleInfoSpy, consoleErrorSpy

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'mockToken',
                customerid: 'testCustomer',
                basketid: 'testBasket'
            }
        }
        res = {
            locals: {
                notification: {
                    eventCode: 'AUTHORISATION',
                    merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
                    reason: '033899:1111:03/2030',
                    amount: {
                        currency: 'EUR',
                        value: 2500
                    },
                    operations: ['CANCEL', 'CAPTURE', 'REFUND'],
                    success: 'true',
                    paymentMethod: 'mc',
                    additionalData: {
                        expiryDate: '03/2030',
                        authCode: '033899',
                        cardBin: '411111',
                        cardSummary: '1111',
                        checkoutSessionId: 'CSF46729982237A879'
                    },
                    merchantReference: '00007503',
                    pspReference: 'NC6HT9CRT65ZGN82',
                    eventDate: '2021-09-13T14:10:22+02:00'
                }
            }
        }
        next = jest.fn()
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    it('update order when success notification is received', async () => {
        await authorizationWebhookHandler(req, res, next)
        expect(res.locals.response).toBe('[accepted]')
        expect(mockUpdateOrderConfirmationStatus).toHaveBeenCalledWith('00007503', 'confirmed')
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith('00007503', 'new')
        expect(mockUpdateOrderExportStatus).toHaveBeenCalledWith('00007503', 'ready')
        expect(mockUpdateOrderPaymentStatus).toHaveBeenCalledWith('00007503', 'paid')
        expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain(
            'AUTHORISATION Authorization for order 00007503 was successful.'
        )
        expect(next).toHaveBeenCalled()
    })
    it('update order when failure notification is received', async () => {
        res.locals.notification.success = 'false'
        await authorizationWebhookHandler(req, res, next)
        expect(res.locals.response).toBe('[accepted]')
        expect(mockUpdateOrderConfirmationStatus).toHaveBeenCalledWith('00007503', 'not_confirmed')
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith('00007503', 'failed')
        expect(mockUpdateOrderExportStatus).toHaveBeenCalledWith('00007503', 'not_exported')
        expect(mockUpdateOrderPaymentStatus).toHaveBeenCalledWith('00007503', 'not_paid')
        expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain(
            'AUTHORISATION Authorization for order 00007503 was not successful.'
        )
        expect(next).toHaveBeenCalled()
    })
    it('does not process notification if eventCode is not AUTHORISATION', async () => {
        res.locals.notification.eventCode = 'CANCELLATION'
        await authorizationWebhookHandler(req, res, next)
        expect(res.locals.response).toBeNil()
        expect(next).toHaveBeenCalled()
    })
    it('return error if order update fails', async () => {
        mockUpdateOrderConfirmationStatus.mockRejectedValueOnce(
            new Error('order confirmation failed')
        )
        await authorizationWebhookHandler(req, res, next)
        expect(res.locals.response).toBeNil()
        expect(next).toHaveBeenCalledWith(new Error('order confirmation failed'))
    })
})
