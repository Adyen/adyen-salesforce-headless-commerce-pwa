// Script to run Adyen notification related jobs
/* API Includes */
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const HookMgr = require('dw/system/HookMgr')

//script includes
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');

function execute() {
    processNotifications();
    clearNotifications();
    return PIPELET_NEXT;
}

/**
 * ProcessNotifications - search for custom objects that need
 *  to be processed and handle them to place or fail order
 */
function processNotifications(/* pdict */) {
    const objectsHandler = require('*/cartridge/scripts/webhooks/handleCustomObject');
    const searchQuery = CustomObjectMgr.queryCustomObjects(
        'adyenNotification',
        "custom.updateStatus = 'PROCESS'",
        null,
    );
    AdyenLogs.info_log(
        `Process notifications start with count ${searchQuery.count}`,
    );

    let customObj;
    let handlerResult;
    let order;
    while (searchQuery.hasNext()) {
        customObj = searchQuery.next();
        Transaction.wrap(() => {
            handlerResult = objectsHandler.handle(customObj);
        });

        /*
          Sometimes order cannot be found in DWRE DB even if it exists there,
          in that case we shouldn't reply to Adyen that all was ok in order to get a new notification
        */

        order = handlerResult.Order;
        if (!handlerResult.status || handlerResult.status === PIPELET_ERROR) {
            // Only CREATED orders can be failed
            if (
                order === null ||
                order.status.value !== dw.order.Order.ORDER_STATUS_CREATED ||
                handlerResult.RefusedHpp
            ) {
                continue;
            }
            // Refused payments which are made with using Adyen payment method are
            // handled when user is redirected back from Adyen HPP.
            // Here we shouldn't fail an order and send a notification
            Transaction.wrap(() => {
                OrderMgr.failOrder(order, true);
            });
            continue;
        }

        if (handlerResult.SkipOrder || handlerResult.Pending) {
            continue;
        }

        // Submitting an order -> update status and send all required email
        if (handlerResult.SubmitOrder) {
            const result = submitOrder(order);
            if (result.error) {
                AdyenLogs.error_log(
                    `Failed to place an order: ${order.orderNo}, during notification process.`,
                );
            }
        }
    }
    AdyenLogs.info_log(
        `Process notifications finished with count ${searchQuery.count}`,
    );
    searchQuery.close();

    return PIPELET_NEXT;
}

/**
 * cleanNotifications
 */
function clearNotifications(/* pdict */) {
    const deleteCustomObjects = require('*/cartridge/scripts/webhooks/deleteCustomObjects');
    const searchQuery = CustomObjectMgr.queryCustomObjects(
        'adyenNotification',
        "custom.processedStatus = 'SUCCESS'",
        null,
    );
    AdyenLogs.info_log(
        `Removing Processed Custom Objects start with count ${searchQuery.count}`,
    );

    let customObj;
    while (searchQuery.hasNext()) {
        customObj = searchQuery.next();
        Transaction.wrap(() => {
            deleteCustomObjects.remove(customObj);
        });
    }
    AdyenLogs.info_log(
        `Removing Processed Custom Objects finished with count ${searchQuery.count}`,
    );
    searchQuery.close();

    return PIPELET_NEXT;
}

/**
 * Calls adyen.order.submit that can be used to send emails to customers
 * @param order {dw.order.Order} The order object to be submitted.
 * @transactional
 * @return {Object} object If order cannot be placed, object.error is set to true.
 */
function submitOrder(order) {
    if (HookMgr.hasHook("adyen.order.submit")) {
        return HookMgr.callHook("adyen.order.submit", "submitOrder", order)
    }
    return true
}

module.exports = {
    execute,
    processNotifications,
    clearNotifications,
};
