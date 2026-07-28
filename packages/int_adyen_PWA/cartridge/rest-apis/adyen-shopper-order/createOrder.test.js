const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const BasketMgr = require('dw/order/BasketMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Currency = require('dw/util/Currency');
const Transaction = require('dw/system/Transaction');
const {createOrder} = require('./createOrder');

function makeBasket(uuid) {
    return {UUID: uuid, updateCurrency: jest.fn()};
}

describe('adyen-shopper-order createOrder', () => {
    beforeEach(() => {
        Currency.getCurrency.mockReturnValue('EUR');
    });

    function setBody(body) {
        global.request.httpParameterMap.requestBodyAsString = JSON.stringify(body);
    }

    it('returns 400 listing every missing required parameter', () => {
        setBody({});

        createOrder();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(
            400,
            'bad_request',
            'Missing required parameters: basketId, orderNo, currency'
        );
    });

    it('returns 400 when the currency is invalid', () => {
        Currency.getCurrency.mockReturnValue(null);
        setBody({basketId: 'basket-1', orderNo: 'order-1', currency: 'XXX'});

        createOrder();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(400, 'bad_request', 'Invalid currency');
    });

    it('returns 404 when neither the current nor temporary basket can be found', () => {
        setBody({basketId: 'basket-1', orderNo: 'order-1', currency: 'EUR'});
        BasketMgr.getCurrentBasket.mockReturnValue(null);
        BasketMgr.getTemporaryBasket.mockReturnValue(null);

        createOrder();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(404, 'not_found', 'Basket not found');
    });

    it('falls back to the temporary basket when the current basket UUID does not match', () => {
        setBody({basketId: 'basket-1', orderNo: 'order-1', currency: 'EUR'});
        BasketMgr.getCurrentBasket.mockReturnValue(makeBasket('other-basket'));
        const temporaryBasket = makeBasket('basket-1');
        BasketMgr.getTemporaryBasket.mockReturnValue(temporaryBasket);
        OrderMgr.createOrder.mockReturnValue({getOrderNo: () => 'order-1'});

        createOrder();

        expect(BasketMgr.getTemporaryBasket).toHaveBeenCalledWith('basket-1');
        expect(temporaryBasket.updateCurrency).toHaveBeenCalled();
        expect(OrderMgr.createOrder).toHaveBeenCalledWith(temporaryBasket, 'order-1');
    });

    it('creates the order and returns its order number on success', () => {
        setBody({basketId: 'basket-1', orderNo: 'order-1', currency: 'EUR'});
        const basket = makeBasket('basket-1');
        BasketMgr.getCurrentBasket.mockReturnValue(basket);
        OrderMgr.createOrder.mockReturnValue({getOrderNo: () => 'order-1'});

        createOrder();

        expect(global.session.setCurrency).toHaveBeenCalledWith('EUR');
        expect(Transaction.begin).toHaveBeenCalled();
        expect(Transaction.commit).toHaveBeenCalled();
        expect(RESTResponseMgr.createSuccess).toHaveBeenCalledWith({orderNo: 'order-1'}, 200);
    });

    it('rolls back the transaction and returns 500 when OrderMgr.createOrder throws', () => {
        setBody({basketId: 'basket-1', orderNo: 'order-1', currency: 'EUR'});
        const basket = makeBasket('basket-1');
        BasketMgr.getCurrentBasket.mockReturnValue(basket);
        OrderMgr.createOrder.mockImplementation(() => {
            throw new Error('cannot create order');
        });

        createOrder();

        expect(Transaction.rollback).toHaveBeenCalled();
        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(
            500,
            'internal_server_error',
            'Failed to create order'
        );
    });

    it('is registered as a public endpoint', () => {
        expect(createOrder.public).toBe(true);
    });
});
