const OrderMgr = require('dw/order/OrderMgr');
const Currency = require('dw/util/Currency');
const Logger = require('dw/system/Logger');
const {handle, execute} = require('./handleNotificationObject');

function makeOrder(overrides = {}) {
    return {
        orderNo: 'ORDER-1',
        creationDate: new Date(Date.now() - 5 * 60 * 1000),
        addNote: jest.fn(),
        getTotalGrossPrice: jest.fn(() => ({
            currencyCode: 'EUR',
            multiply: jest.fn((factor) => ({value: 1000 * factor}))
        })),
        ...overrides
    };
}

function makeCustomObj(overrides = {}) {
    return {
        custom: {
            orderId: '00000123-20240101120000000',
            eventCode: 'AUTHORISATION',
            operations: [],
            ...overrides
        }
    };
}

describe('handleNotificationObject', () => {
    beforeEach(() => {
        Currency.getCurrency.mockReturnValue('EUR');
    });

    describe('handle', () => {
        it('skips a $0 recurring payment notification when the order cannot be found', () => {
            OrderMgr.getOrder.mockReturnValue(null);
            const customObj = makeCustomObj({
                orderId: 'recurringPayment-00000123-20240101120000000'
            });

            const result = handle(customObj);

            expect(result.SkipOrder).toBe(true);
            expect(result.status).toBe(global.PIPELET_ERROR);
            expect(customObj.custom.processedStatus).toBe('SUCCESS');
        });

        it('logs an error and does not skip when a non-recurring order cannot be found', () => {
            OrderMgr.getOrder.mockReturnValue(null);
            const customObj = makeCustomObj();

            const result = handle(customObj);

            expect(result.SkipOrder).toBeFalsy();
            expect(result.status).toBe(global.PIPELET_ERROR);
            expect(Logger.__logger.error).toHaveBeenCalled();
        });

        it('skips processing while the order is still inside the notification delay window', () => {
            const order = makeOrder({creationDate: new Date()});
            OrderMgr.getOrder.mockReturnValue(order);
            const customObj = makeCustomObj();

            const result = handle(customObj);

            expect(result.SkipOrder).toBe(true);
            expect(result.status).toBe(global.PIPELET_NEXT);
        });

        it('dispatches to the matching event handler once past the delay window', () => {
            jest.mock('./eventHandlers/AUTHORISATION', () => ({
                handle: jest.fn(() => ({success: true}))
            }));
            const order = makeOrder();
            OrderMgr.getOrder.mockReturnValue(order);
            const customObj = makeCustomObj();

            const result = handle(customObj);

            expect(result.status).toBe(global.PIPELET_NEXT);
            expect(order.addNote).toHaveBeenCalledWith(
                'Adyen Payment Notification',
                expect.any(String)
            );
            expect(customObj.custom.processedStatus).toBe('SUCCESS');
        });

        it('computes Pending only for PENDING events whose handler reports pending: true', () => {
            jest.mock('./eventHandlers/PENDING', () => ({
                handle: jest.fn(() => ({pending: true}))
            }));
            const order = makeOrder();
            OrderMgr.getOrder.mockReturnValue(order);
            const customObj = makeCustomObj({eventCode: 'PENDING'});

            const result = handle(customObj);

            expect(result.Pending).toBe(true);
        });

        it('logs an unhandled-status message when no event handler module exists for the event code', () => {
            const order = makeOrder();
            OrderMgr.getOrder.mockReturnValue(order);
            const customObj = makeCustomObj({eventCode: 'SOME_UNKNOWN_EVENT'});

            const result = handle(customObj);

            expect(result.Pending).toBe(false);
            expect(result.status).toBe(global.PIPELET_NEXT);
            expect(Logger.__logger.error).toHaveBeenCalled();
            expect(Logger.__logger.info).toHaveBeenCalledWith(
                expect.stringContaining('received unhandled status SOME_UNKNOWN_EVENT')
            );
        });
    });

    describe('execute', () => {
        it('maps the handle() result onto the args object and returns the resulting status', () => {
            OrderMgr.getOrder.mockReturnValue(null);
            const customObj = makeCustomObj();
            const args = {CustomObj: customObj};

            const status = execute(args);

            expect(status).toBe(global.PIPELET_ERROR);
            expect(args.EventCode).toBe('AUTHORISATION');
            expect(args.SubmitOrder).toBe(false);
            expect(args.SkipOrder).toBeFalsy();
            expect(args.Order).toBeNull();
        });
    });
});
