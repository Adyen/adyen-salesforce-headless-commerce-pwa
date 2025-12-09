const Transaction = require('dw/system/Transaction');
const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const Logger = require('dw/system/Logger');
const BasketMgr = require('dw/order/BasketMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Currency = require('dw/util/Currency');

exports.createOrder = function () {
    try {
        const requestBody = request.httpParameterMap.requestBodyAsString;
        const {customerId, basketId, orderNo, currency} = JSON.parse(requestBody);
        if (!basketId || !orderNo || !currency) {
            const missing = []
            if (!basketId) missing.push('basketId')
            if (!orderNo) missing.push('orderNo')
            if (!currency) missing.push('currency')
            const errorMessage = `Missing required parameters: ${missing.join(', ')}`
            Logger.error('Error creating order: {0}', errorMessage)
            RESTResponseMgr.createError(400, 'bad_request', errorMessage).render()
            return
        }
        const newCurrency = Currency.getCurrency(currency);
        if (!newCurrency) {
            Logger.error('Error creating order: {0}', 'Invalid currency');
            RESTResponseMgr.createError(400, 'bad_request', 'Invalid currency').render();
            return;
        }
        session.setCurrency(newCurrency);

        let currentBasket = BasketMgr.getCurrentBasket();
        if (currentBasket.UUID !== basketId) {
            currentBasket = BasketMgr.getTemporaryBasket(basketId)
        }
        if (!currentBasket) {
          Logger.error('Error creating order: {0}', 'Basket not found');
          RESTResponseMgr.createError(404, 'not_found', 'Basket not found').render();
          return;
        }
        currentBasket.updateCurrency();

        Transaction.begin();
        try {
            const order = OrderMgr.createOrder(currentBasket, orderNo);
            Transaction.commit();
            const response = {
                orderNo: order.getOrderNo()
            };
            RESTResponseMgr.createSuccess(response, 200).render();
        } catch (e) {
            Transaction.rollback();
            throw e; // Re-throw to be caught by the outer catch block
        }
    } catch (e) {
        Logger.error('Error creating order: {0}', e.message);
        RESTResponseMgr.createError(500, 'internal_server_error', 'Failed to create order').render();
    }
};
exports.createOrder.public = true;
