const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');
const {handleSuccessfulAuthorisation} = require('./AUTHORISATION');

/**
 * Main handler for MANUAL_REVIEW_ACCEPT webhook events.
 * Called when a manual review is accepted in the Adyen Customer Area.
 * @param {Object} params - Handler parameters
 * @param {dw.order.Order} params.order - The order object
 * @param {Object} params.result - Result object to modify
 * @returns {Object} Handler result with success status
 */
function handle({order, result}) {
    AdyenLogs.info_log(`MANUAL_REVIEW_ACCEPT webhook handler called for order ${order.orderNo}`);

    if (order.paymentStatus.value === Order.PAYMENT_STATUS_PAID) {
        AdyenLogs.info_log(`Duplicate MANUAL_REVIEW_ACCEPT received for order ${order.orderNo}.`);
        return {success: true};
    }

    if (order.status.value === Order.ORDER_STATUS_FAILED) {
        OrderMgr.undoFailOrder(order);
        order.trackOrderChange(
            'MANUAL_REVIEW_ACCEPT webhook received for failed order, moving order status to CREATED',
        );
    }

    handleSuccessfulAuthorisation(order, result);
    return {success: true};
}

module.exports = {handle};
