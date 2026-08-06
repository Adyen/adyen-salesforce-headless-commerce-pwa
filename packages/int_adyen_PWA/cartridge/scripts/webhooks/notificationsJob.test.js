jest.mock('*/cartridge/scripts/webhooks/handleNotificationObject', () => ({
    handle: jest.fn()
}));

const OrderMgr = require('dw/order/OrderMgr');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const HookMgr = require('dw/system/HookMgr');
const Logger = require('dw/system/Logger');
const handleNotificationObject = require('*/cartridge/scripts/webhooks/handleNotificationObject');
const {execute, processNotifications, clearNotifications} = require('./notificationsJob');

function makeSearchQuery(items) {
    let index = 0;
    return {
        count: items.length,
        hasNext: jest.fn(() => index < items.length),
        next: jest.fn(() => items[index++]),
        close: jest.fn()
    };
}

function makeOrder(statusValue) {
    return {orderNo: 'ORDER-1', status: {value: statusValue}};
}

function makeCustomObj(overrides = {}) {
    return {custom: {orderId: 'ORDER-1-20240101120000000', merchantReference: 'ref-1', ...overrides}};
}

describe('notificationsJob', () => {
    describe('processNotifications', () => {
        it('fails a CREATED order when the handler result has no status', () => {
            const order = makeOrder(global.dw.order.Order.ORDER_STATUS_CREATED);
            handleNotificationObject.handle.mockReturnValue({status: undefined, Order: order});
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([makeCustomObj()]));

            processNotifications();

            expect(OrderMgr.failOrder).toHaveBeenCalledWith(order, true);
        });

        it('fails a CREATED order when the handler result status is PIPELET_ERROR', () => {
            const order = makeOrder(global.dw.order.Order.ORDER_STATUS_CREATED);
            handleNotificationObject.handle.mockReturnValue({
                status: global.PIPELET_ERROR,
                Order: order
            });
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([makeCustomObj()]));

            processNotifications();

            expect(OrderMgr.failOrder).toHaveBeenCalledWith(order, true);
        });

        it('does not fail the order when it is not in CREATED status', () => {
            const order = makeOrder('OPEN');
            handleNotificationObject.handle.mockReturnValue({status: undefined, Order: order});
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([makeCustomObj()]));

            processNotifications();

            expect(OrderMgr.failOrder).not.toHaveBeenCalled();
        });

        it('skips submitting the order when SkipOrder is true', () => {
            const order = makeOrder('OPEN');
            handleNotificationObject.handle.mockReturnValue({
                status: global.PIPELET_NEXT,
                SkipOrder: true,
                SubmitOrder: true,
                Order: order
            });
            HookMgr.hasHook.mockReturnValue(true);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([makeCustomObj()]));

            processNotifications();

            expect(HookMgr.callHook).not.toHaveBeenCalled();
        });

        it('skips submitting the order when Pending is true', () => {
            const order = makeOrder('OPEN');
            handleNotificationObject.handle.mockReturnValue({
                status: global.PIPELET_NEXT,
                Pending: true,
                SubmitOrder: true,
                Order: order
            });
            HookMgr.hasHook.mockReturnValue(true);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([makeCustomObj()]));

            processNotifications();

            expect(HookMgr.callHook).not.toHaveBeenCalled();
        });

        it('submits the order via the adyen.order.submit hook when appropriate', () => {
            const order = makeOrder('OPEN');
            handleNotificationObject.handle.mockReturnValue({
                status: global.PIPELET_NEXT,
                SubmitOrder: true,
                Order: order
            });
            HookMgr.hasHook.mockReturnValue(true);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([makeCustomObj()]));

            processNotifications();

            expect(HookMgr.callHook).toHaveBeenCalledWith('adyen.order.submit', 'submitOrder', order);
        });

        it('does not submit the order when the submit hook is not registered', () => {
            const order = makeOrder('OPEN');
            handleNotificationObject.handle.mockReturnValue({
                status: global.PIPELET_NEXT,
                SubmitOrder: true,
                Order: order
            });
            HookMgr.hasHook.mockReturnValue(false);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([makeCustomObj()]));

            processNotifications();

            expect(HookMgr.callHook).not.toHaveBeenCalled();
        });

        it('logs and continues when handling an item throws', () => {
            handleNotificationObject.handle.mockImplementation(() => {
                throw new Error('boom');
            });
            const searchQuery = makeSearchQuery([makeCustomObj(), makeCustomObj()]);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(searchQuery);

            expect(() => processNotifications()).not.toThrow();

            expect(Logger.__logger.error).toHaveBeenCalled();
            expect(searchQuery.close).toHaveBeenCalled();
        });

        it('closes the search query even when no items are found', () => {
            const searchQuery = makeSearchQuery([]);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(searchQuery);

            const status = processNotifications();

            expect(searchQuery.close).toHaveBeenCalled();
            expect(status).toBe(global.PIPELET_NEXT);
        });
    });

    describe('clearNotifications', () => {
        it('removes every successfully processed custom object', () => {
            const items = [makeCustomObj(), makeCustomObj()];
            const searchQuery = makeSearchQuery(items);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(searchQuery);

            clearNotifications();

            expect(CustomObjectMgr.remove).toHaveBeenCalledTimes(2);
            expect(searchQuery.close).toHaveBeenCalled();
        });

        it('logs an error and continues when removing an item fails', () => {
            const items = [makeCustomObj(), makeCustomObj()];
            const searchQuery = makeSearchQuery(items);
            CustomObjectMgr.queryCustomObjects.mockReturnValue(searchQuery);
            CustomObjectMgr.remove.mockImplementationOnce(() => {
                throw new Error('cannot remove');
            });

            expect(() => clearNotifications()).not.toThrow();

            expect(Logger.__logger.error).toHaveBeenCalled();
            expect(CustomObjectMgr.remove).toHaveBeenCalledTimes(2);
        });
    });

    describe('execute', () => {
        it('runs processNotifications and clearNotifications and returns PIPELET_NEXT', () => {
            CustomObjectMgr.queryCustomObjects.mockReturnValue(makeSearchQuery([]));

            const status = execute();

            expect(CustomObjectMgr.queryCustomObjects).toHaveBeenCalledWith(
                'adyenNotification',
                "custom.updateStatus = 'PROCESS'",
                null
            );
            expect(CustomObjectMgr.queryCustomObjects).toHaveBeenCalledWith(
                'adyenNotification',
                "custom.processedStatus = 'SUCCESS'",
                null
            );
            expect(status).toBe(global.PIPELET_NEXT);
        });
    });
});
