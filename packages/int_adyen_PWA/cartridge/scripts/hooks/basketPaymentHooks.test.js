const basketPaymentHooks = require('./basketPaymentHooks');

describe('basketPaymentHooks', () => {
    it('exposes a beforePOST hook that can be called without throwing', () => {
        expect(typeof basketPaymentHooks.beforePOST).toBe('function');
        expect(() => basketPaymentHooks.beforePOST({}, {})).not.toThrow();
    });

    it('exposes an afterPOST hook that can be called without throwing', () => {
        expect(typeof basketPaymentHooks.afterPOST).toBe('function');
        expect(() => basketPaymentHooks.afterPOST({}, {})).not.toThrow();
    });

    it('exposes a modifyPOSTResponse hook that can be called without throwing', () => {
        expect(typeof basketPaymentHooks.modifyPOSTResponse).toBe('function');
        expect(() => basketPaymentHooks.modifyPOSTResponse({}, {}, {})).not.toThrow();
    });
});
