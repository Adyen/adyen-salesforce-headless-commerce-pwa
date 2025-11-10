const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');

function handle({order}) {
    AdyenLogs.info_log(`Order ${order.orderNo} was in pending status.`);
    return {pending: true};
}

module.exports = {handle};
