const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Logger = require('dw/system/Logger');
const Transaction = require('dw/system/Transaction');

/**
 * Implements the PATCH method for the adyen-order API.
 * This function updates an order payment instrument custom props.
 */
exports.updateOrderPaymentInstrument = function () {
  try {
    Logger.info('updateOrderPaymentInstrument', 'start');
    const match = request.httpPath.match(/\/orders\/([^/]+)\/payment-instruments$/);
    const orderNo = match ? match[1] : null;
    const requestBody = request.httpParameterMap.requestBodyAsString;
    const allowedCustomProperties = ['donationToken', 'pspReference', 'cardInstallments'];
    const {pspReference, customProperties = {}} = JSON.parse(requestBody);
    if (!orderNo) {
      RESTResponseMgr.createError(400, 'bad_request', 'Missing orderNo parameter').render();
      return;
    }

    const order = OrderMgr.getOrder(orderNo);
    if (order) {
      const paymentInstruments = order.paymentInstruments.toArray();
      let paymentInstrument = paymentInstruments.find((pi) => pspReference && pi.custom.pspReference === pspReference);
      if (!paymentInstrument) {
        paymentInstrument = paymentInstruments.find((pi) => pi.custom.paymentMethodType !== 'giftcard');
      }
      if (!paymentInstrument) {
        RESTResponseMgr.createError(404, 'not_found', 'Payment instrument not found').render();
        return;
      }
      Transaction.wrap(function () {
        allowedCustomProperties.forEach((prop) => {
          if (
            Object.prototype.hasOwnProperty.call(customProperties, prop) &&
            customProperties[prop] !== undefined
          ) {
            paymentInstrument.custom[prop] = customProperties[prop];
          }
        });
      });
      RESTResponseMgr.createSuccess({}, 200).render();
    } else {
      RESTResponseMgr.createError(404, 'not_found', 'Order not found').render();
    }
  } catch (e) {
    Logger.error('Error retrieving order: {0}', e.message);
    RESTResponseMgr.createError(500, 'internal_server_error', 'Failed to retrieve order').render();
  }
}

exports.updateOrderPaymentInstrument.public = true;