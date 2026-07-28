const orderPaymentHooks = require('./orderPaymentHooks');

describe('orderPaymentHooks', () => {
    it('exposes a beforePOST hook that can be called without throwing', () => {
        expect(typeof orderPaymentHooks.beforePOST).toBe('function');
        expect(() => orderPaymentHooks.beforePOST({}, {})).not.toThrow();
    });

    it('exposes a beforePATCH hook that can be called without throwing', () => {
        expect(typeof orderPaymentHooks.beforePATCH).toBe('function');
        expect(() => orderPaymentHooks.beforePATCH({}, {}, {})).not.toThrow();
    });

    it('exposes an afterPOST hook that can be called without throwing', () => {
        expect(typeof orderPaymentHooks.afterPOST).toBe('function');
        expect(() => orderPaymentHooks.afterPOST({}, {})).not.toThrow();
    });

    it('exposes an afterPATCH hook that can be called without throwing', () => {
        expect(typeof orderPaymentHooks.afterPATCH).toBe('function');
        expect(() => orderPaymentHooks.afterPATCH({}, {}, {})).not.toThrow();
    });

    it('exposes a modifyPOSTResponse hook that can be called without throwing', () => {
        expect(typeof orderPaymentHooks.modifyPOSTResponse).toBe('function');
        expect(() => orderPaymentHooks.modifyPOSTResponse({}, {}, {})).not.toThrow();
    });
});
