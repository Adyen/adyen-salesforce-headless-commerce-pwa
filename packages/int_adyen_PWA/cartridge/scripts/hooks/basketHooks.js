const Transaction = require('dw/system/Transaction')
const OrderMgr = require('dw/order/OrderMgr')
const Site = require('dw/system/Site')

exports.afterPOST = function (basket) {
    const preCreateOrderNo = Site.getCurrent().getCustomPreferenceValue('createOrderNoInBasketHook')
    if (!preCreateOrderNo) {
        return
    }
    Transaction.wrap(() => {
        if (!basket.custom.orderNo) {
            basket.custom.orderNo = OrderMgr.createOrderNo()
        } else {
            const order = OrderMgr.getOrder(basket.custom.orderNo)
            if (order) {
                basket.custom.orderNo = OrderMgr.createOrderNo()
            }
        }
    })
}
