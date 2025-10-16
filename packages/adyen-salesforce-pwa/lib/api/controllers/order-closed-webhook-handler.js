import {OrderApiClient} from '../models/orderApi'
import {NOTIFICATION_EVENT_CODES, NOTIFICATION_SUCCESS, ORDER} from '../../utils/constants.mjs'
import Logger from '../models/logger'
import {getOrderUsingOrderNo} from "../helpers/orderHelper";

const messages = {
    AUTH_ERROR: 'Access Denied!',
    AUTH_SUCCESS: '[accepted]',
    DEFAULT_ERROR: 'Technical error!'
}

async function orderClosedWebhookHandler(req, res, next) {
    try {
        const {NotificationRequestItem: notification = {}} = res.locals.notification
        if (notification.eventCode !== NOTIFICATION_EVENT_CODES.ORDER_CLOSED) {
            return next()
        }
        const orderNo = notification.merchantReference
        const order = await getOrderUsingOrderNo(orderNo)
        if (!order?.orderNo) {
            Logger.info(notification.eventCode, `Order ${orderNo} was not found.`)
            return next()
        }
        const orderApi = new OrderApiClient()
        if (notification.success === NOTIFICATION_SUCCESS.TRUE) {
            Logger.info(
                notification.eventCode,
                `ORDER_CLOSED for order ${orderNo} was successful.`
            )
            await orderApi.updateOrderConfirmationStatus(
                orderNo,
                ORDER.CONFIRMATION_STATUS_CONFIRMED
            )
            await orderApi.updateOrderPaymentStatus(orderNo, ORDER.PAYMENT_STATUS_PAID)
            await orderApi.updateOrderExportStatus(orderNo, ORDER.EXPORT_STATUS_READY)
            await orderApi.updateOrderStatus(orderNo, ORDER.ORDER_STATUS_NEW)
        } else {
            Logger.info(
                notification.eventCode,
                `ORDER_CLOSED for order ${orderNo} was not successful.`
            )
            await orderApi.updateOrderConfirmationStatus(
                orderNo,
                ORDER.CONFIRMATION_STATUS_NOT_CONFIRMED
            )
            await orderApi.updateOrderPaymentStatus(orderNo, ORDER.PAYMENT_STATUS_NOT_PAID)
            await orderApi.updateOrderExportStatus(orderNo, ORDER.EXPORT_STATUS_NOT_EXPORTED)
            await orderApi.updateOrderStatus(orderNo, ORDER.ORDER_STATUS_FAILED)
        }

        res.locals.response = messages.AUTH_SUCCESS
        return next()
    } catch (err) {
        return next(err)
    }
}

export {orderClosedWebhookHandler}
