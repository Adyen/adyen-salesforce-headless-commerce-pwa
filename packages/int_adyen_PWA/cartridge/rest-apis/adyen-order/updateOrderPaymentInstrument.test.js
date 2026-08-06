const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const OrderMgr = require('dw/order/OrderMgr');
const {updateOrderPaymentInstrument} = require('./updateOrderPaymentInstrument');

function makePaymentInstrument(custom = {}) {
    return {custom};
}

function makeOrder(paymentInstruments) {
    return {paymentInstruments: {toArray: () => paymentInstruments}};
}

describe('adyen-order updateOrderPaymentInstrument', () => {
    beforeEach(() => {
        global.request.httpParameterMap.requestBodyAsString = JSON.stringify({
            pspReference: 'psp-1',
            customProperties: {pspReference: 'psp-1', donationToken: 'token-1', notAllowed: 'nope'}
        });
    });

    it('returns 400 when the orderNo cannot be parsed from the path', () => {
        global.request.httpPath = '/adyen-order/orders//payment-instruments';

        updateOrderPaymentInstrument();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(400, 'bad_request', 'Missing orderNo parameter');
    });

    it('returns 404 when the order does not exist', () => {
        global.request.httpPath = '/adyen-order/orders/ORDER-1/payment-instruments';
        OrderMgr.getOrder.mockReturnValue(null);

        updateOrderPaymentInstrument();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(404, 'not_found', 'Order not found');
    });

    it('returns 404 when no matching payment instrument is found', () => {
        global.request.httpPath = '/adyen-order/orders/ORDER-1/payment-instruments';
        const giftcard = makePaymentInstrument({pspReference: 'other', paymentMethodType: 'giftcard'});
        OrderMgr.getOrder.mockReturnValue(makeOrder([giftcard]));

        updateOrderPaymentInstrument();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(404, 'not_found', 'Payment instrument not found');
    });

    it('updates only the allowed custom properties on the matched instrument', () => {
        global.request.httpPath = '/adyen-order/orders/ORDER-1/payment-instruments';
        const pi = makePaymentInstrument({pspReference: 'psp-1', paymentMethodType: 'scheme'});
        OrderMgr.getOrder.mockReturnValue(makeOrder([pi]));

        updateOrderPaymentInstrument();

        expect(pi.custom.donationToken).toBe('token-1');
        expect(pi.custom.notAllowed).toBeUndefined();
        expect(RESTResponseMgr.createSuccess).toHaveBeenCalledWith({}, 200);
    });

    it('falls back to the first non-giftcard instrument when pspReference is not provided', () => {
        global.request.httpParameterMap.requestBodyAsString = JSON.stringify({
            customProperties: {donationToken: 'token-2'}
        });
        global.request.httpPath = '/adyen-order/orders/ORDER-1/payment-instruments';
        const giftcard = makePaymentInstrument({pspReference: 'other', paymentMethodType: 'giftcard'});
        const fallback = makePaymentInstrument({pspReference: 'other-2', paymentMethodType: 'scheme'});
        OrderMgr.getOrder.mockReturnValue(makeOrder([giftcard, fallback]));

        updateOrderPaymentInstrument();

        expect(fallback.custom.donationToken).toBe('token-2');
        expect(giftcard.custom.donationToken).toBeUndefined();
    });

    it('returns 500 when the request body is malformed', () => {
        global.request.httpParameterMap.requestBodyAsString = '{not-json';
        global.request.httpPath = '/adyen-order/orders/ORDER-1/payment-instruments';

        updateOrderPaymentInstrument();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(
            500,
            'internal_server_error',
            'Failed to retrieve order'
        );
    });

    it('is registered as a public endpoint', () => {
        expect(updateOrderPaymentInstrument.public).toBe(true);
    });
});
