const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Logger = require('dw/system/Logger');

/**
 * Implements the GET method for the adyen-order API.
 * This function retrieves an order based on the provided order number.
 */
exports.getOrder = function () {
    try {
        const orderNo = request.httpPath.split('/').pop();
        if (!orderNo) {
            RESTResponseMgr.createError(400, 'bad_request', 'Missing orderNo parameter').render();
            return;
        }

        const order = OrderMgr.getOrder(orderNo);
        if (order) {
            const grossPrice = order.getTotalGrossPrice();
            const response = {
                total: grossPrice.value,
                currency: grossPrice.currencyCode
            }
            RESTResponseMgr.createSuccess(response, 200).render();
        } else {
            RESTResponseMgr.createError(404, 'not_found', 'Order not found').render();
        }
    } catch (e) {
        Logger.error('Error retrieving order: {0}', e.message);
        RESTResponseMgr.createError(500, 'internal_server_error', 'Failed to retrieve order').render();
    }
}

exports.getOrder.public = true;