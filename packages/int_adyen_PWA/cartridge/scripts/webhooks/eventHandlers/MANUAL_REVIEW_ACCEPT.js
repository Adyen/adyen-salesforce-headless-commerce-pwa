const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');
const {isWebhookSuccessful} = require('*/cartridge/scripts/utils/notificationEventHelper');
const {handleSuccessfulAuthorisation} = require('./AUTHORISATION');

/**
 * Main handler for MANUAL_REVIEW_ACCEPT webhook events.
 * Called when a manual review is accepted in the Adyen Customer Area.
 * @param {Object} params - Handler parameters
 * @param {dw.order.Order} params.order - The order object
 * @param {Object} params.customObj - Custom object from webhook
 * @param {Object} params.result - Result object to modify
 */
function handle({order, customObj, result}) {
    AdyenLogs.info_log(`MANUAL_REVIEW_ACCEPT webhook handler called for order ${order.orderNo}`);
    if (isWebhookSuccessful(customObj)) {
        order.trackOrderChange(
            'Manual review is accepted in Adyen Customer Area, placing the order',
        );
        handleSuccessfulAuthorisation(order, result);
    }
}

module.exports = {handle};
