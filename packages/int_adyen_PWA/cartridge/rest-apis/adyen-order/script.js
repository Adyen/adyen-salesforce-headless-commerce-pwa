const Transaction = require('dw/system/Transaction');
const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const Logger = require('dw/system/Logger');
const BasketMgr = require('dw/order/BasketMgr');
const OrderMgr = require('dw/order/OrderMgr');

exports.createOrder = function () {
    const requestBody = request.httpParameterMap.requestBodyAsString;
    const {customerId, basketId, orderNo} = JSON.parse(requestBody);
    const currentBasket = BasketMgr.getCurrentBasket()
    Transaction.begin();
    if (basketId) {
        const order = OrderMgr.createOrder(currentBasket, orderNo)
        Transaction.commit();
        RESTResponseMgr.createSuccess(order, 200).render();
    } else {
        RESTResponseMgr.createError(
            403,
            'forbidden',
        ).render();
        Transaction.rollback();
    }
};
exports.createOrder.public = true;
