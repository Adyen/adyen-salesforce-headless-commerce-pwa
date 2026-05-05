const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');
const {isWebhookSuccessful} = require('*/cartridge/scripts/utils/notificationEventHelper');

/**
 * Main handler for MANUAL_REVIEW_REJECT webhook events.
 * Called when a manual review is rejected in the Adyen Customer Area.
 * @param {Object} params - Handler parameters
 * @param {dw.order.Order} params.order - The order object
 * @param {Object} params.customObj - Custom object from webhook
 */
function handle({order, customObj}) {
    AdyenLogs.info_log(`MANUAL_REVIEW_REJECT webhook handler called for order ${order.orderNo}`);
    if (isWebhookSuccessful(customObj)) {
        order.trackOrderChange(
            'Manual review is not accepted in Adyen Customer Area, failing the order',
        );
        order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
        Transaction.wrap(() => {
            OrderMgr.failOrder(order, false);
        });
    }
}

module.exports = {handle};
