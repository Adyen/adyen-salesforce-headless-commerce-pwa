const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const {handle} = require('./MANUAL_REVIEW_REJECT');

function makeOrder() {
    return {
        orderNo: 'ORDER-1',
        setPaymentStatus: jest.fn(),
        trackOrderChange: jest.fn()
    };
}

describe('MANUAL_REVIEW_REJECT event handler', () => {
    it('fails the order when the webhook was successful', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'true'}};

        handle({order, customObj});

        expect(order.trackOrderChange).toHaveBeenCalledWith(
            'Manual review is not accepted in Adyen Customer Area, failing the order'
        );
        expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_NOTPAID);
        expect(OrderMgr.failOrder).toHaveBeenCalledWith(order, false);
    });

    it('does nothing when the webhook was unsuccessful', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'false'}};

        handle({order, customObj});

        expect(order.setPaymentStatus).not.toHaveBeenCalled();
        expect(OrderMgr.failOrder).not.toHaveBeenCalled();
    });
});
