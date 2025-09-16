import {OrderApiClient} from './orderApi'
import {NOTIFICATION_EVENT_CODES, NOTIFICATION_SUCCESS, ORDER} from '../../utils/constants.mjs'
import Logger from './logger'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'

const messages = {
    AUTH_ERROR: 'Access Denied!',
    AUTH_SUCCESS: '[accepted]',
    DEFAULT_ERROR: 'Technical error!'
}

async function authorizationWebhookHandler(req, res, next) {
    try {
        const notification = res.locals.notification
        if (notification.eventCode !== NOTIFICATION_EVENT_CODES.AUTHORISATION) {
            return next()
        }
        const orderNo = notification.merchantReference
        const orderApi = new OrderApiClient()
        if (notification.success === NOTIFICATION_SUCCESS.TRUE) {
            Logger.info(
                notification.eventCode,
                `Authorization for order ${orderNo} was successful.`
            )
            const order = await orderApi.getOrder(orderNo)
            const totalAmount = getCurrencyValueForApi(order.orderTotal, order.currency)
            const amount = notification.amount.value
            if (amount < totalAmount) {
                await orderApi.updateOrderPaymentStatus(orderNo, ORDER.PAYMENT_STATUS_PART_PAID)
            } else {
                await orderApi.updateOrderConfirmationStatus(
                    orderNo,
                    ORDER.CONFIRMATION_STATUS_CONFIRMED
                )
                await orderApi.updateOrderPaymentStatus(orderNo, ORDER.PAYMENT_STATUS_PAID)
                await orderApi.updateOrderExportStatus(orderNo, ORDER.EXPORT_STATUS_READY)
                await orderApi.updateOrderStatus(orderNo, ORDER.ORDER_STATUS_NEW)
            }
        } else {
            Logger.info(
                notification.eventCode,
                `Authorization for order ${orderNo} was not successful.`
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

export {authorizationWebhookHandler}
