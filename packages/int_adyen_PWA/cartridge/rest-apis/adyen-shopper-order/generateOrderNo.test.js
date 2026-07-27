const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const OrderMgr = require('dw/order/OrderMgr');
const {generateOrderNo} = require('./generateOrderNo');

describe('adyen-shopper-order generateOrderNo', () => {
    it('returns the generated order number on success', () => {
        OrderMgr.createOrderNo.mockReturnValue('order-1');

        generateOrderNo();

        expect(RESTResponseMgr.createSuccess).toHaveBeenCalledWith({orderNo: 'order-1'}, 200);
        expect(RESTResponseMgr.__successResponse.render).toHaveBeenCalled();
    });

    it('returns 500 when order number generation fails', () => {
        OrderMgr.createOrderNo.mockImplementation(() => {
            throw new Error('boom');
        });

        generateOrderNo();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(
            500,
            'internal_server_error',
            'Failed to generate order number'
        );
    });

    it('is registered as a public endpoint', () => {
        expect(generateOrderNo.public).toBe(true);
    });
});
