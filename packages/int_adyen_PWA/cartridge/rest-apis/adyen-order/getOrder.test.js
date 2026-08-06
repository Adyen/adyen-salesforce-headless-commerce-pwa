const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const OrderMgr = require('dw/order/OrderMgr');
const {getOrder} = require('./getOrder');

describe('adyen-order getOrder', () => {
    it('returns 400 when the orderNo cannot be parsed from the path', () => {
        global.request.httpPath = '/adyen-order/orders/';

        getOrder();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(400, 'bad_request', 'Missing orderNo parameter');
    });

    it('returns the order total and currency when the order exists', () => {
        global.request.httpPath = '/adyen-order/orders/ORDER-1';
        OrderMgr.getOrder.mockReturnValue({
            getOrderNo: () => 'ORDER-1',
            getTotalGrossPrice: () => ({value: 100, currencyCode: 'EUR'})
        });

        getOrder();

        expect(RESTResponseMgr.createSuccess).toHaveBeenCalledWith(
            {orderNo: 'ORDER-1', total: 100, currency: 'EUR'},
            200
        );
        expect(RESTResponseMgr.__successResponse.render).toHaveBeenCalled();
    });

    it('returns 404 when the order does not exist', () => {
        global.request.httpPath = '/adyen-order/orders/ORDER-1';
        OrderMgr.getOrder.mockReturnValue(null);

        getOrder();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(404, 'not_found', 'Order not found');
    });

    it('returns 500 when an unexpected error occurs', () => {
        global.request.httpPath = '/adyen-order/orders/ORDER-1';
        OrderMgr.getOrder.mockImplementation(() => {
            throw new Error('boom');
        });

        getOrder();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(
            500,
            'internal_server_error',
            'Failed to retrieve order'
        );
    });

    it('is registered as a public endpoint', () => {
        expect(getOrder.public).toBe(true);
    });
});
