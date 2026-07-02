const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const Logger = require('dw/system/Logger');

/**
 * Implements the POST method for the adyen-order API.
 * This function updates custom attributes on an order.
 */
exports.updateOrderCustomAttributes = function () {
  try {
    Logger.info('updateOrderCustomAttributes', 'start');
    const match = request.httpPath.match(/\/orders\/([^/]+)\/custom-attributes$/);
    const orderNo = match ? match[1] : null;
    const requestBody = request.httpParameterMap.requestBodyAsString;
    const allowedCustomAttributes = [
      'Adyen_Payment_Method',
      'Adyen_Payment_Method_Variant',
      'terminalId',
      'storeId',
    ];
    const {customAttributes = {}} = JSON.parse(requestBody);
    if (!orderNo) {
      RESTResponseMgr.createError(400, 'bad_request', 'Missing orderNo parameter').render();
      return;
    }

    const order = OrderMgr.getOrder(orderNo);
    if (order) {
      Transaction.wrap(function () {
        allowedCustomAttributes.forEach((attr) => {
          if (
            Object.prototype.hasOwnProperty.call(customAttributes, attr) &&
            customAttributes[attr] !== undefined
          ) {
            order.custom[attr] = customAttributes[attr];
          }
        });
      });
      RESTResponseMgr.createSuccess({}, 200).render();
    } else {
      RESTResponseMgr.createError(404, 'not_found', 'Order not found').render();
    }
  } catch (e) {
    Logger.error('Error updating order custom attributes: {0}', e.message);
    RESTResponseMgr.createError(500, 'internal_server_error', 'Failed to update order').render();
  }
}

exports.updateOrderCustomAttributes.public = true;
