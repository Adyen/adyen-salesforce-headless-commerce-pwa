const Transaction = require('dw/system/Transaction');
const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const Logger = require('dw/system/Logger');
const OrderMgr = require('dw/order/OrderMgr');

exports.generateOrderNo = function () {
    try {
        let orderNo;
        Transaction.wrap(() => {
            orderNo = OrderMgr.createOrderNo();
        });
        RESTResponseMgr.createSuccess({orderNo: orderNo}, 200).render();
    } catch (e) {
        Logger.error('Error generating order number: {0}', e.message);
        RESTResponseMgr.createError(500, 'internal_server_error', 'Failed to generate order number').render();
    }
};
exports.generateOrderNo.public = true;
