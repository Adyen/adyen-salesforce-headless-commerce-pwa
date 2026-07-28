const OrderMgr = require('dw/order/OrderMgr');
const Currency = require('dw/util/Currency');
const Status = require('dw/system/Status');
const Logger = require('dw/system/Logger');
const {placeOrder, getCurrencyValueForApi, getDivisorForCurrency} = require('./orderHelper');

describe('orderHelper', () => {
    describe('placeOrder', () => {
        function fakeOrder() {
            return {orderNo: 'ORDER-1'};
        }

        it('returns no error when OrderMgr.placeOrder succeeds', () => {
            OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.OK});
            const order = fakeOrder();

            const result = placeOrder(order);

            expect(result).toEqual({error: false});
            expect(OrderMgr.failOrder).not.toHaveBeenCalled();
        });

        it('fails the order and returns an error when OrderMgr.placeOrder returns ERROR', () => {
            OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.ERROR});
            const order = fakeOrder();

            const result = placeOrder(order);

            expect(result).toEqual({error: true});
            expect(OrderMgr.failOrder).toHaveBeenCalledWith(order, true);
            expect(Logger.__logger.error).toHaveBeenCalled();
        });
    });

    describe('getCurrencyValueForApi', () => {
        it('uses the amount currencyCode when Currency.getCurrency resolves it', () => {
            Currency.getCurrency.mockReturnValue('EUR');
            const amount = {
                currencyCode: 'EUR',
                multiply: jest.fn((factor) => ({value: 12.345 * factor}))
            };

            const result = getCurrencyValueForApi(amount);

            expect(amount.multiply).toHaveBeenCalledWith(100);
            expect(result.value).toBe(Math.round(12.345 * 100));
            expect(result.currencyCode).toBe('EUR');
        });

        it('falls back to the session currency when Currency.getCurrency returns nothing', () => {
            Currency.getCurrency.mockReturnValue(undefined);
            global.session.currency.currencyCode = 'JPY';
            const amount = {
                currencyCode: 'unknown',
                multiply: jest.fn((factor) => ({value: 500 * factor}))
            };

            const result = getCurrencyValueForApi(amount);

            expect(amount.multiply).toHaveBeenCalledWith(1);
            expect(result.value).toBe(500);
            expect(result.currencyCode).toBe('JPY');
        });
    });

    describe('getDivisorForCurrency', () => {
        it.each([
            ['JPY', 1],
            ['USD', 100],
            ['BHD', 1000]
        ])('returns divisor for currency %s => %i', (currencyCode, expected) => {
            expect(getDivisorForCurrency({currencyCode})).toBe(expected);
        });

        it('falls back to the session currency when no currencyCode is provided', () => {
            global.session.currency.currencyCode = 'BHD';
            expect(getDivisorForCurrency({})).toBe(1000);
        });
    });
});
