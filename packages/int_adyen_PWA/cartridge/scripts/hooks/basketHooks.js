const Logger = require('dw/system/Logger');
const Transaction = require('dw/system/Transaction');
const OrderMgr = require('dw/order/OrderMgr');

exports.afterPOST = function (basket) {
    Transaction.wrap(() => {
        if (!basket.custom.orderNo) {
            basket.custom.orderNo = OrderMgr.createOrderNo();
        }
    });
};

exports.modifyPATCHResponse = function (basket, basketResponse) {
    Transaction.wrap(() => {
        const orderNo = basket.custom.orderNo
        const orderData = basket.custom.orderData
        if (orderNo && orderData && orderData?.remainingAmount?.value === 0) {
            const order = OrderMgr.createOrder(
                basket,
                orderNo,
            );
            basketResponse.c_order = order
        }

    });
};
