const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');

/**
 * Main handler for MANUAL_REVIEW_REJECT webhook events.
 * Called when a manual review is rejected in the Adyen Customer Area.
 * @param {Object} params - Handler parameters
 * @param {dw.order.Order} params.order - The order object
 * @returns {Object} Handler result with success status
 */
function handle({order}) {
    AdyenLogs.info_log(`MANUAL_REVIEW_REJECT webhook handler called for order ${order.orderNo}`);

    order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
    order.trackOrderChange('MANUAL_REVIEW_REJECT notification received');
    Transaction.wrap(() => {
        OrderMgr.failOrder(order, false);
    });

    AdyenLogs.info_log(
        `Order ${order.orderNo} rejected by manual review and updated to status NOT PAID.`,
    );
    return {success: true};
}

module.exports = {handle};
