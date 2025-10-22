const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');

function notify(notificationData) {
    // Check the input parameters
    if (notificationData === null) {
        AdyenLogs.fatal_log(
            'Handling of Adyen notification has failed. No input parameters were provided.',
        );
        return PIPELET_NEXT;
    }

    try {
        const msg = createLogMessage(notificationData);
        AdyenLogs.debug_log(msg);
        const calObj = new Calendar();
        const keyValue = `${
            notificationData.merchantReference
        }-${StringUtils.formatCalendar(calObj, 'yyyyMMddhhmmssSSS')}`;
        const customObj = CustomObjectMgr.createCustomObject(
            'adyenNotification',
            keyValue,
        );
        for (const field in notificationData) {
            try {
                customObj.custom[field] = notificationData[field];
            } catch (e) {
                /* unknown field */
            }
        }

        switch (notificationData.eventCode) {
            case 'AUTHORISATION':
                // Save all request to custom attribute for Authorization event
                customObj.custom.Adyen_log = JSON.stringify(notificationData);
            // eslint-disable-next-line no-fallthrough
            case 'CANCELLATION':
            case 'CANCEL_OR_REFUND':
            case 'REFUND':
            case 'CAPTURE_FAILED':
            case 'ORDER_OPENED':
            case 'ORDER_CLOSED':
            case 'OFFER_CLOSED':
            case 'PENDING':
            case 'CAPTURE':
            case 'MANUAL_REVIEW_ACCEPT':
            case 'MANUAL_REVIEW_REJECT':
            case 'DONATION':
                customObj.custom.updateStatus = 'PROCESS';
                AdyenLogs.info_log(
                    `Received notification for merchantReference ${notificationData.merchantReference} with status ${notificationData.eventCode}. Custom Object set up to 'PROCESS' status.`,
                );
                break;
            default:
                customObj.custom.updateStatus = 'PENDING';
                AdyenLogs.info_log(
                    `Received notification for merchantReference ${notificationData.merchantReference} with status ${notificationData.eventCode}. Custom Object set up to 'PENDING' status.`,
                );
        }
        return {
            success: true,
        };
    } catch (error) {
        AdyenLogs.error_log('Notification failed', error);
        return {
            success: false,
            errorMessage: error.message,
        };
    }
}

function createLogMessage(notificationData) {
    const VERSION = '4d';
    let msg = '';
    msg = `AdyenNotification v ${VERSION}`;
    msg += '\n================================================================\n';
    msg = `${msg}reason : ${notificationData.reason}`;
    msg = `${msg}\neventDate : ${notificationData.eventDate}`;
    msg = `${msg}\nmerchantReference : ${notificationData.merchantReference}`;
    msg = `${msg}\ncurrency : ${notificationData.currency}`;
    msg = `${msg}\npspReference : ${notificationData.pspReference}`;
    msg = `${msg}\nmerchantAccountCode : ${notificationData.merchantAccountCode}`;
    msg = `${msg}\neventCode : ${notificationData.eventCode}`;
    msg = `${msg}\nvalue : ${notificationData.value}`;
    msg = `${msg}\noperations : ${notificationData.operations}`;
    msg = `${msg}\nsuccess : ${notificationData.success}`;
    msg = `${msg}\npaymentMethod : ${notificationData.paymentMethod}`;
    msg = `${msg}\nlive : ${notificationData.live}`;
    return msg;
}

module.exports = {
    notify,
};
