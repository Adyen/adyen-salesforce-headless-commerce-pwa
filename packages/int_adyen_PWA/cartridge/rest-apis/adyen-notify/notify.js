const Transaction = require('dw/system/Transaction');
const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const handleNotify = require('*/cartridge/scripts/webhooks/handleNotify');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');

/**
 * Called by Adyen to update status of payments. It should always display [accepted] when finished.
 */
exports.notify = function () {
    AdyenLogs.info_log('notify called')
    const requestBody = request.httpParameterMap.requestBodyAsString;
    const req = JSON.parse(requestBody);
    Transaction.begin();
    const notificationResult = handleNotify.notify(req);
    if (notificationResult?.success) {
        Transaction.commit();
        RESTResponseMgr.createEmptySuccess(200).render();
    } else {
        AdyenLogs.error_log(notificationResult?.error);
        RESTResponseMgr.createError(
            500, {
                title: 'internal server error',
            }
        ).render();
        Transaction.rollback();
    }
};
exports.notify.public = true;