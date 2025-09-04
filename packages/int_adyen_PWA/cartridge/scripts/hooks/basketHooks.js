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

exports.afterPATCH = function (basket, basketResponse) {
    Logger.getLogger('Adyen_debug', 'Adyen').debug(basket)
    Logger.getLogger('Adyen_debug', 'Adyen').debug(basketResponse)
    Transaction.wrap(() => {
        const orderNo = basket.custom.orderNo
        const orderData = basket.custom.orderData
    });
};
