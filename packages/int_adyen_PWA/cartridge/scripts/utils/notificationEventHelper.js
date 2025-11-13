const Transaction = require('dw/system/Transaction');
const PaymentMgr = require('dw/order/PaymentMgr');
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const Money = require('dw/value/Money');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');
const constants = require('*/cartridge/scripts/utils/constants');
const {getDivisorForCurrency} = require('*/cartridge/scripts/utils/orderHelper')

/**
 * Create or update a custom object with notification data in a transaction.
 * @param {Object} data - The data to assign to custom fields
 * @returns {dw.object.CustomObject} The created or updated custom object
 */
function createOrUpdateNotificationObject(data) {
    let customObj;
    const CustomObjectMgr = require('dw/object/CustomObjectMgr');
    Transaction.wrap(() => {
        const calObj = new Calendar();
        const key = `${
            data.merchantReference
        }-${StringUtils.formatCalendar(calObj, constants.DATE_FORMAT)}`;
        customObj = CustomObjectMgr.getCustomObject(constants.ADYEN_NOTIFICATION_NAME, key);
        if (!customObj) {
            customObj = CustomObjectMgr.createCustomObject(constants.ADYEN_NOTIFICATION_NAME, key);
        }
        for (const field in data) {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                try {
                    customObj.custom[field] = data[field];
                } catch (e) {
                    // unknown field, ignore
                }
            }
        }
        if (constants.AMOUNT in data) {
            try {
                customObj.custom.value = data.amount.value;
                customObj.custom.currency = data.amount.currency;
            } catch (e) {
                /* unknown field */
            }
        }

        // Set status and log
        const isProcessEvent = constants.PROCESS_EVENTS.includes(data.eventCode);
        const newStatus = isProcessEvent
            ? constants.UPDATE_STATUS.PROCESS
            : constants.UPDATE_STATUS.PENDING;

        customObj.custom.updateStatus = newStatus;

        AdyenLogs.info_log(
            `Received notification for merchantReference ${data.merchantReference} with status ${data.eventCode}. Custom Object set to '${newStatus}' status.`,
        );

        customObj.custom.log = JSON.stringify(data);
    });
    return customObj;
}

/**
 * Creates a log message string for Adyen notification data
 * @param {dw.object.CustomObject} customObj
 * @returns {string}
 */
function createLogMessage(customObj) {
    const VERSION = customObj.custom.version;
    let msg = '';
    msg = `AdyenNotification v ${VERSION} - Payment info (Called from : ${customObj.custom.httpRemoteAddress})`;
    msg += '\n================================================================\n';
    msg = `${msg}reason : ${customObj.custom.reason}`;
    msg = `${msg}\neventDate : ${customObj.custom.eventDate}`;
    msg = `${msg}\nmerchantReference : ${customObj.custom.merchantReference}`;
    msg = `${msg}\ncurrency : ${customObj.custom.currency}`;
    msg = `${msg}\npspReference : ${customObj.custom.pspReference}`;
    msg = `${msg}\nmerchantAccountCode : ${customObj.custom.merchantAccountCode}`;
    msg = `${msg}\neventCode : ${customObj.custom.eventCode}`;
    msg = `${msg}\nvalue : ${customObj.custom.value}`;
    msg = `${msg}\noperations : ${customObj.custom.operations.join(',')}`;
    msg = `${msg}\nsuccess : ${customObj.custom.success}`;
    msg = `${msg}\npaymentMethod : ${customObj.custom.paymentMethod}`;
    msg = `${msg}\nlive : ${customObj.custom.live}`;
    return msg;
}

/**
 * Checks if the webhook event was successful
 * @param {Object} customObj - The custom object from the webhook
 * @returns {boolean} True if the webhook event was successful
 */
function isWebhookSuccessful(customObj) {
    return customObj && customObj.custom && customObj.custom.success === 'true';
}

/**
 * Checks Adyen payment instruments and updates paymentTransaction if found.
 * @param {dw.order.Order} order - The order object
 * @param {Object} customObj - The custom object containing Adyen event log
 * @param {string} transactionType - The transaction type where the value is one of TYPE_AUTH, TYPE_AUTH_REVERSAL, TYPE_CAPTURE or TYPE_CREDIT.
 * @returns {boolean} - True if any Adyen instrument was found
 */
function updatePaymentTransaction(order, customObj, transactionType) {
    const paymentInstruments = order.getPaymentInstruments();
    Object.values(paymentInstruments).forEach((pi) => {
        const processor = PaymentMgr.getPaymentMethod(
            pi.getPaymentMethod(),
        ).getPaymentProcessor();
        if (pi.custom.pspReference === customObj.custom.pspReference) {
            const amount = new Money(customObj.custom.value, customObj.custom.currency);
            const divideBy = getDivisorForCurrency(amount);
            const transactionAmount = amount.divide(divideBy);
            Transaction.wrap(function () {
                pi.paymentTransaction.setTransactionID(customObj.custom.pspReference);
                pi.paymentTransaction.setType(transactionType);
                pi.paymentTransaction.setPaymentProcessor(processor);
                pi.paymentTransaction.setAmount(transactionAmount);
                pi.paymentTransaction.setAccountID(customObj.custom.merchantAccountCode);
                pi.paymentTransaction.custom.notification_data = customObj.custom.log;
            })
        }
    });
}

module.exports = {
    createOrUpdateNotificationObject,
    createLogMessage,
    isWebhookSuccessful,
    updatePaymentTransaction
};
