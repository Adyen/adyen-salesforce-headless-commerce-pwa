import {orderClosedWebhookHandler} from '../order-closed-webhook-handler.js'
import {OrderApiClient} from '../../models/orderApi.js'
import {NOTIFICATION_EVENT_CODES, NOTIFICATION_SUCCESS, ORDER} from '../../../utils/constants.mjs'
import Logger from '../../models/logger.js'
import {getOrderUsingOrderNo} from '../../helpers/orderHelper.js'

// Mock dependencies
jest.mock('../../models/orderApi.js')
jest.mock('../../models/logger.js')
jest.mock('../../helpers/orderHelper.js')

describe('orderClosedWebhookHandler', () => {
    let req, res, next
    let mockUpdateOrderStatus,
        mockUpdateOrderPaymentStatus,
        mockUpdateOrderExportStatus,
        mockUpdateOrderConfirmationStatus

    beforeEach(() => {
        jest.clearAllMocks()

        req = {}
        res = {
            locals: {
                notification: {
                    eventCode: NOTIFICATION_EVENT_CODES.ORDER_CLOSED,
                    merchantReference: 'ORDER-123',
                    success: NOTIFICATION_SUCCESS.TRUE
                }
            }
        }
        next = jest.fn()

        mockUpdateOrderStatus = jest.fn()
        mockUpdateOrderPaymentStatus = jest.fn()
        mockUpdateOrderExportStatus = jest.fn()
        mockUpdateOrderConfirmationStatus = jest.fn()

        OrderApiClient.mockImplementation(() => ({
            updateOrderStatus: mockUpdateOrderStatus,
            updateOrderPaymentStatus: mockUpdateOrderPaymentStatus,
            updateOrderExportStatus: mockUpdateOrderExportStatus,
            updateOrderConfirmationStatus: mockUpdateOrderConfirmationStatus
        }))

        getOrderUsingOrderNo.mockResolvedValue({orderNo: 'ORDER-123'})
    })

    it('should ignore notifications that are not ORDER_CLOSED', async () => {
        res.locals.notification.eventCode = 'AUTHORISATION'

        await orderClosedWebhookHandler(req, res, next)

        expect(getOrderUsingOrderNo).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('should ignore notifications if the order cannot be found', async () => {
        getOrderUsingOrderNo.mockResolvedValue({orderNo: null})

        await orderClosedWebhookHandler(req, res, next)

        expect(getOrderUsingOrderNo).toHaveBeenCalledWith('ORDER-123')
        expect(OrderApiClient).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('should update order to a successful state when notification success is true', async () => {
        res.locals.notification.success = NOTIFICATION_SUCCESS.TRUE

        await orderClosedWebhookHandler(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith(
            NOTIFICATION_EVENT_CODES.ORDER_CLOSED,
            'ORDER_CLOSED for order ORDER-123 was successful.'
        )
        expect(mockUpdateOrderConfirmationStatus).toHaveBeenCalledWith(
            'ORDER-123',
            ORDER.CONFIRMATION_STATUS_CONFIRMED
        )
        expect(mockUpdateOrderPaymentStatus).toHaveBeenCalledWith(
            'ORDER-123',
            ORDER.PAYMENT_STATUS_PAID
        )
        expect(mockUpdateOrderExportStatus).toHaveBeenCalledWith(
            'ORDER-123',
            ORDER.EXPORT_STATUS_READY
        )
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith('ORDER-123', ORDER.ORDER_STATUS_NEW)
        expect(res.locals.response).toBe('[accepted]')
        expect(next).toHaveBeenCalledWith()
    })

    it('should update order to a failed state when notification success is false', async () => {
        res.locals.notification.success = NOTIFICATION_SUCCESS.FALSE

        await orderClosedWebhookHandler(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith(
            NOTIFICATION_EVENT_CODES.ORDER_CLOSED,
            'ORDER_CLOSED for order ORDER-123 was not successful.'
        )
        expect(mockUpdateOrderConfirmationStatus).toHaveBeenCalledWith(
            'ORDER-123',
            ORDER.CONFIRMATION_STATUS_NOT_CONFIRMED
        )
        expect(mockUpdateOrderPaymentStatus).toHaveBeenCalledWith(
            'ORDER-123',
            ORDER.PAYMENT_STATUS_NOT_PAID
        )
        expect(mockUpdateOrderExportStatus).toHaveBeenCalledWith(
            'ORDER-123',
            ORDER.EXPORT_STATUS_NOT_EXPORTED
        )
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith('ORDER-123', ORDER.ORDER_STATUS_FAILED)
        expect(res.locals.response).toBe('[accepted]')
        expect(next).toHaveBeenCalledWith()
    })

    it('should call next with an error if getOrderUsingOrderNo fails', async () => {
        const mockError = new Error('API Error')
        getOrderUsingOrderNo.mockRejectedValue(mockError)

        await orderClosedWebhookHandler(req, res, next)

        expect(next).toHaveBeenCalledWith(mockError)
    })

    it('should call next with an error if an order update fails', async () => {
        const mockError = new Error('Update failed')
        mockUpdateOrderStatus.mockRejectedValue(mockError)

        await orderClosedWebhookHandler(req, res, next)

        expect(next).toHaveBeenCalledWith(mockError)
    })
})