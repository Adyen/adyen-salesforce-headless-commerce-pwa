const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const {handle} = require('./CAPTURE');

function makeOrder(statusValue) {
    return {
        orderNo: 'ORDER-1',
        status: {value: statusValue},
        setPaymentStatus: jest.fn(),
        setExportStatus: jest.fn(),
        setConfirmationStatus: jest.fn()
    };
}

describe('CAPTURE event handler', () => {
    it('undoes the cancellation when the webhook succeeded and the order is cancelled', () => {
        const order = makeOrder(Order.ORDER_STATUS_CANCELLED);
        const customObj = {custom: {success: 'true'}};

        handle({order, customObj});

        expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_PAID);
        expect(order.setExportStatus).toHaveBeenCalledWith(Order.EXPORT_STATUS_READY);
        expect(order.setConfirmationStatus).toHaveBeenCalledWith(Order.CONFIRMATION_STATUS_CONFIRMED);
        expect(OrderMgr.undoCancelOrder).toHaveBeenCalledWith(order);
    });

    it('does nothing when the order is not cancelled', () => {
        const order = makeOrder(Order.ORDER_STATUS_CREATED);
        const customObj = {custom: {success: 'true'}};

        handle({order, customObj});

        expect(order.setPaymentStatus).not.toHaveBeenCalled();
        expect(OrderMgr.undoCancelOrder).not.toHaveBeenCalled();
    });

    it('does nothing when the webhook was unsuccessful', () => {
        const order = makeOrder(Order.ORDER_STATUS_CANCELLED);
        const customObj = {custom: {success: 'false'}};

        handle({order, customObj});

        expect(order.setPaymentStatus).not.toHaveBeenCalled();
        expect(OrderMgr.undoCancelOrder).not.toHaveBeenCalled();
    });
});
