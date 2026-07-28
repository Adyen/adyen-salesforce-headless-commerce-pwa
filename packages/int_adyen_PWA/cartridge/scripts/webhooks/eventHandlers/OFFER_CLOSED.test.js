const Order = require('dw/order/Order');
const Transaction = require('dw/system/Transaction');
const OrderMgr = require('dw/order/OrderMgr');
const {handle} = require('./OFFER_CLOSED');

describe('OFFER_CLOSED event handler', () => {
    it('always fails the order and sets it to NOTPAID', () => {
        const order = {
            orderNo: 'ORDER-1',
            setPaymentStatus: jest.fn(),
            trackOrderChange: jest.fn()
        };

        handle({order});

        expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_NOTPAID);
        expect(order.trackOrderChange).toHaveBeenCalledWith('Offer closed, failing order');
        expect(Transaction.wrap).toHaveBeenCalled();
        expect(OrderMgr.failOrder).toHaveBeenCalledWith(order, false);
    });
});
