const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');
const {
    createOrUpdateNotificationObject,
    createLogMessage,
} = require('*/cartridge/scripts/utils/notificationEventHelper');

/**
 * Called by Adyen to update status of payments. It should always display [accepted] when finished.
 */
exports.notify = function () {
    try {
        const requestBody = request.httpParameterMap.requestBodyAsString;
        if (!requestBody) {
            throw new Error('Adyen notification has failed. Empty request body.');
        }

        const {notificationData} = JSON.parse(requestBody);
        if (!notificationData) {
            throw new Error('Adyen notification has failed. No notification data provided.');
        }

        const customObj = createOrUpdateNotificationObject(notificationData);
        const msg = createLogMessage(customObj);
        AdyenLogs.debug_log(msg);

        RESTResponseMgr.createSuccess({success: true}, 200).render();
        AdyenLogs.info_log('Notify processed successfully');
    } catch (e) {
        AdyenLogs.error_log(e.message, e.stack);
        RESTResponseMgr.createError(500, 'internal_server_error').render();
    }
};
exports.notify.public = true;