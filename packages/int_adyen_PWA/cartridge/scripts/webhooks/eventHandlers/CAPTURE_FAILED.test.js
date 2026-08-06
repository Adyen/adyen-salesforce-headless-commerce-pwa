const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const {handle} = require('./CAPTURE_FAILED');

function makeOrder() {
    return {
        orderNo: 'ORDER-1',
        setPaymentStatus: jest.fn(),
        trackOrderChange: jest.fn()
    };
}

describe('CAPTURE_FAILED event handler', () => {
    it('cancels the order when the webhook was successful', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'true'}};

        handle({order, customObj});

        expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_NOTPAID);
        expect(order.trackOrderChange).toHaveBeenCalledWith('Capture failed, cancelling order');
        expect(OrderMgr.cancelOrder).toHaveBeenCalledWith(order);
    });

    it('does not cancel the order when the webhook was unsuccessful', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'false'}};

        handle({order, customObj});

        expect(order.setPaymentStatus).not.toHaveBeenCalled();
        expect(OrderMgr.cancelOrder).not.toHaveBeenCalled();
    });
});
