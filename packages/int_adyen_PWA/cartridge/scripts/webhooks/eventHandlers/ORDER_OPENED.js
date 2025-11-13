const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');
const {isWebhookSuccessful} = require('*/cartridge/scripts/utils/notificationEventHelper');

function handle({order, customObj}) {
    if (isWebhookSuccessful(customObj)) {
        AdyenLogs.info_log(`Order ${order.orderNo} opened for partial payments`);
    }
}

module.exports = {handle};
