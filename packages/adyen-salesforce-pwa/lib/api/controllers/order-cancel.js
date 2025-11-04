import Logger from './logger'
import {AdyenError} from '../models/AdyenError'
import {OrderApiClient} from "./orderApi";
import {ShopperOrders} from "commerce-sdk-isomorphic";
import {ORDER} from "../../utils/constants.mjs";

const errorMessages = {
    INVALID_ORDER: 'order is invalid',
}

async function orderCancel(req, res, next) {
    Logger.info('orderCancel', 'start')
    let order
    try {
        const {orderNo} = req.body

        const shopperOrders = new ShopperOrders({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        order = await shopperOrders.getOrder({
            parameters: {
                orderNo: orderNo
            }
        })
        if (!order) {
            throw new AdyenError(errorMessages.INVALID_ORDER, 404, JSON.stringify(order))
        }
        if (order?.customerInfo?.customerId !== req.headers.customerid) {
            throw new AdyenError(errorMessages.INVALID_ORDER, 404, JSON.stringify(order))
        }
        const orderApi = new OrderApiClient()
        await orderApi.updateOrderStatus(order.orderNo, ORDER.ORDER_STATUS_FAILED_REOPEN);

        Logger.info('orderCancel', `basket reopened`);
        next()
    } catch (err) {
        Logger.error('orderCancel', JSON.stringify(err))
        next(err)
    }
}

export default orderCancel
