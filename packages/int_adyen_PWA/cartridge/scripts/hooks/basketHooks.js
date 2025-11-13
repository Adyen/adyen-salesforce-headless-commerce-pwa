const Transaction = require('dw/system/Transaction');
const OrderMgr = require('dw/order/OrderMgr');

exports.afterPOST = function (basket) {
    Transaction.wrap(() => {
        if (!basket.custom.orderNo) {
            basket.custom.orderNo = OrderMgr.createOrderNo();
        } else {
            const order = OrderMgr.getOrder(basket.custom.orderNo);
            if (order) {
                basket.custom.orderNo = OrderMgr.createOrderNo();
            }
        }
    });
};
