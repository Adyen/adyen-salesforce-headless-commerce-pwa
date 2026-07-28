const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const Status = require('dw/system/Status');
const {handle} = require('./ORDER_CLOSED');

function makeOrder() {
    return {
        orderNo: 'ORDER-1',
        setPaymentStatus: jest.fn(),
        setExportStatus: jest.fn(),
        setConfirmationStatus: jest.fn()
    };
}

describe('ORDER_CLOSED event handler', () => {
    it('places the order when the webhook value matches the total amount', () => {
        OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.OK});
        const order = makeOrder();
        const customObj = {custom: {success: 'true', value: '1000'}};

        handle({order, customObj, totalAmount: 1000});

        expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_PAID);
        expect(order.setExportStatus).toHaveBeenCalledWith(Order.EXPORT_STATUS_READY);
        expect(order.setConfirmationStatus).toHaveBeenCalledWith(Order.CONFIRMATION_STATUS_CONFIRMED);
    });

    it('does not place the order when the amount does not match', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'true', value: '500'}};

        handle({order, customObj, totalAmount: 1000});

        expect(order.setPaymentStatus).not.toHaveBeenCalled();
        expect(OrderMgr.placeOrder).not.toHaveBeenCalled();
    });

    it('does not place the order when the webhook was unsuccessful', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'false', value: '1000'}};

        handle({order, customObj, totalAmount: 1000});

        expect(order.setPaymentStatus).not.toHaveBeenCalled();
        expect(OrderMgr.placeOrder).not.toHaveBeenCalled();
    });

    it('does not update statuses when placeOrder fails', () => {
        OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.ERROR});
        const order = makeOrder();
        const customObj = {custom: {success: 'true', value: '1000'}};

        handle({order, customObj, totalAmount: 1000});

        expect(order.setPaymentStatus).not.toHaveBeenCalled();
        expect(OrderMgr.failOrder).toHaveBeenCalledWith(order, true);
    });
});
