// Script to run Adyen notification related jobs
/* API Includes */
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const HookMgr = require('dw/system/HookMgr')

//script includes
const handleNotificationObject = require('*/cartridge/scripts/webhooks/handleNotificationObject');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');

/**
 * Processes a single notification custom object
 * @param {Object} customObj - The custom object to process
 */
function processNotificationItem(customObj) {
    try {
        let handlerResult;
        Transaction.wrap(() => {
            handlerResult = handleNotificationObject.handle(customObj);
        });

        const order = handlerResult.Order;

        // Handle failed order scenarios
        if (!handlerResult.status || handlerResult.status === PIPELET_ERROR) {
            // Only fail CREATED orders. If the order doesn't exist or is in a different state, skip.
            if (order && order.status.value === dw.order.Order.ORDER_STATUS_CREATED) {
                Transaction.wrap(() => {
                    OrderMgr.failOrder(order, true);
                });
            }
            return;
        }

        // Handle successful order processing, skipping if necessary
        if (handlerResult.SkipOrder || handlerResult.Pending) {
            return;
        }

        // Submit order and send confirmation email if applicable
        if (handlerResult.SubmitOrder && HookMgr.hasHook('adyen.order.submit')) {
            HookMgr.callHook('adyen.order.submit', 'submitOrder', order);
        }
    } catch (e) {
        AdyenLogs.error_log(
            `Failed to process notification for order ${customObj.custom.orderId}. Error: ${e.message}`,
            e.stack,
        );
    }
}

/**
 * ProcessNotifications - search for custom objects that need
 *  to be processed and handle them to place or fail order
 */
function processNotifications(/* pdict */) {
    const searchQuery = CustomObjectMgr.queryCustomObjects(
        'adyenNotification',
        "custom.updateStatus = 'PROCESS'",
        null,
    );
    AdyenLogs.info_log(
        `Process notifications start with count ${searchQuery.count}`,
    );

    try {
        while (searchQuery.hasNext()) {
            const customObj = searchQuery.next();
            processNotificationItem(customObj);
        }
    } finally {
        AdyenLogs.info_log(
            `Process notifications finished.`,
        );
        if (searchQuery) {
            searchQuery.close();
        }
    }

    return PIPELET_NEXT;
}

/**
 * clearNotifications - search for custom objects that have been successfully processed
 * and remove them to keep the system clean.
 */
function clearNotifications(/* pdict */) {
    const searchQuery = CustomObjectMgr.queryCustomObjects(
        'adyenNotification',
        "custom.processedStatus = 'SUCCESS'",
        null,
    );
    AdyenLogs.info_log(
        `Removing Processed Custom Objects start with count ${searchQuery.count}`,
    );

    while (searchQuery.hasNext()) {
        const customObj = searchQuery.next();
        try {
            Transaction.wrap(() => {
                CustomObjectMgr.remove(customObj);
            });
        } catch (e) {
            AdyenLogs.error_log(
                `Error occurred during delete CO, merchantReference: ${customObj.custom.merchantReference}, error message: ${e.message}`,
                e,
            );
        }
    }
    AdyenLogs.info_log(
        `Removing Processed Custom Objects finished with count ${searchQuery.count}`,
    );
    searchQuery.close();

    return PIPELET_NEXT;
}

function execute() {
    processNotifications();
    clearNotifications();
    return PIPELET_NEXT;
}

module.exports = {
    execute,
    processNotifications,
    clearNotifications,
};
