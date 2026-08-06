const Order = require('dw/order/Order');
const {handle} = require('./CANCELLATION');

describe('CANCELLATION event handler', () => {
    it('sets the order to NOTPAID and tracks the change', () => {
        const order = {
            orderNo: 'ORDER-1',
            setPaymentStatus: jest.fn(),
            trackOrderChange: jest.fn()
        };

        handle({order});

        expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_NOTPAID);
        expect(order.trackOrderChange).toHaveBeenCalledWith('CANCELLATION notification received');
    });
});
