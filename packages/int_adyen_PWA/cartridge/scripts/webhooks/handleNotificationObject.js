const OrderMgr = require('dw/order/OrderMgr');
// script includes
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');
const {getCurrencyValueForApi} = require('*/cartridge/scripts/utils/orderHelper');
const {createLogMessage} = require('*/cartridge/scripts/utils/notificationEventHelper');

/**
 * Extracts and processes the order ID from the custom object
 * @param {Object} customObj - The custom object containing order information
 * @returns {string} The processed order ID
 */
function extractOrderId(customObj) {
    // split order ID by - and remove last split (which is the date)
    const orderIdParts = customObj.custom.orderId.split('-');
    orderIdParts.pop();
    // in case the splitted array contains more than 1 element (DONATION case), get only the last split (which is the order number)
    const relevantOrderIdParts =
        orderIdParts.length > 1 ? orderIdParts.slice(-1) : orderIdParts;
    return relevantOrderIdParts.join('-');
}

function setProcessedCOInfo(customObj) {
    customObj.custom.processedDate = new Date();
    customObj.custom.updateStatus = 'SUCCESS';
    customObj.custom.processedStatus = 'SUCCESS';
}

/**
 * Validates the order and handles null order scenarios
 * @param {Object} order - The order object
 * @param {Object} customObj - The custom object
 * @returns {{isValid: boolean, result: Object}} The validation status and result object
 */
function validateOrder(order, customObj) {
    const validation = {isValid: true, result: {}};
    if (order === null) {
        // check to see if this was a $0.00 auth for recurring payment. if yes, CO can safely be deleted
        const orderIdParts = customObj.custom.orderId.split('-');
        if (orderIdParts.indexOf('recurringPayment') > -1) {
            validation.result.SkipOrder = true;
            setProcessedCOInfo(customObj);
        } else {
            AdyenLogs.error_log(
                `Notification for not existing order ${customObj.custom.orderId} received.`,
            );
        }
        validation.isValid = false;
        return validation;
    }
    return validation;
}

function createDelayOrderDate(orderCreateDate) {
    // AdyenNotificationDelayMinutes
    const adyenDelayMin = 1;

    // Variable in milliseconds
    const newDate = new Date();
    newDate.setTime(orderCreateDate.getTime() + adyenDelayMin * 60 * 1000);
    return newDate;
}

/**
 * Validates if the order is ready for processing based on creation date
 * @param {Object} order - The order object
 * @returns {{isValid: boolean, result: Object}} The validation status and result object
 */
function validateOrderTiming(order) {
    const validation = {isValid: true, result: {}};
    const orderCreateDate = order.creationDate;
    const orderCreateDateDelay = createDelayOrderDate(orderCreateDate);
    const currentDate = new Date();
    AdyenLogs.debug_log(
        `Order date ${orderCreateDate} , orderCreateDateDelay ${orderCreateDateDelay} , currentDate ${currentDate}`,
    );

    if (orderCreateDateDelay >= currentDate) {
        AdyenLogs.debug_log('Order date > current Date.');
        validation.result.SkipOrder = true;
        validation.result.status = PIPELET_NEXT;
        validation.isValid = false;
        return validation;
    }
    return validation;
}

/**
 * Handles the result from an event handler and extracts pending status
 * @param {Object} handlerResult - The result from the event handler
 * @param {string} eventCode - The event code being processed
 * @returns {boolean} The pending status
 */
function extractPendingStatus(handlerResult, eventCode) {
    if (eventCode === 'PENDING' && handlerResult && handlerResult.pending) {
        return handlerResult.pending;
    }
    return false;
}

/**
 * Processes the event using the appropriate event handler
 * @param {Object} order - The order object
 * @param {Object} customObj - The custom object
 * @param {Object} result - The result object
 * @param {number} totalAmount - The total amount
 * @returns {boolean} The pending status from event processing
 */
function processEventHandler(order, customObj, result, totalAmount) {
    // Handle all events using dedicated event handlers
    try {
        // eslint-disable-next-line
        const handlerModule = require(
            `./eventHandlers/${customObj.custom.eventCode}`,
        );
        if (handlerModule && typeof handlerModule.handle === 'function') {
            const handlerResult = handlerModule.handle({
                order,
                customObj,
                result,
                totalAmount,
            });
            return extractPendingStatus(handlerResult, customObj.custom.eventCode);
        }
    } catch (error) {
        // Handler module doesn't exist for this event type
        AdyenLogs.error_log(
            `No handler module found for event code: ${customObj.custom.eventCode}`, error
        );
    }

    // Handle unhandled event types
    AdyenLogs.info_log(
        `Order ${order.orderNo} received unhandled status ${customObj.custom.eventCode}`,
    );
    return false;
}

/**
 * Finalizes the order by updating PSP reference and adding notes
 * @param {Object} order - The order object
 * @param {Object} customObj - The custom object
 */
function finalizeOrder(order, customObj) {
    // Add a note with all details
    order.addNote('Adyen Payment Notification', createLogMessage(customObj));
    setProcessedCOInfo(customObj);
}

/**
 * Main handler function for processing custom objects
 * @param {Object} customObj - The custom object to process
 * @returns {Object} The result object with processing status
 */
function handle(customObj) {
    let result = {
        status: PIPELET_ERROR,
        EventCode: customObj.custom.eventCode,
        SubmitOrder: false,
        SkipOrder: false,
    };

    const orderId = extractOrderId(customObj);
    const order = OrderMgr.getOrder(orderId);
    result.Order = order;

    const orderValidation = validateOrder(order, customObj);
    if (!orderValidation.isValid) {
        Object.assign(result, orderValidation.result);
        return result;
    }

    const timingValidation = validateOrderTiming(order);
    if (!timingValidation.isValid) {
        Object.assign(result, timingValidation.result);
        return result;
    }

    const totalAmount = getCurrencyValueForApi(
        order.getTotalGrossPrice(),
    ).value;
    const pending = processEventHandler(order, customObj, result, totalAmount);
    finalizeOrder(order, customObj);

    result.status = PIPELET_NEXT;
    result.Pending = pending;

    return result;
}

function execute(args) {
    const result = handle(args.CustomObj);

    args.EventCode = result.EventCode;
    args.SubmitOrder = result.SubmitOrder;

    args.Pending = result.Pending;
    args.SkipOrder = result.SkipOrder;
    args.Order = result.Order;

    return result.status;
}

module.exports = {
    execute,
    handle,
};
