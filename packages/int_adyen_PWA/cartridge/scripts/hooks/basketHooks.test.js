const basketHooks = require('./basketHooks');

describe('basketHooks', () => {
    it('exposes an afterPOST hook that can be called without throwing', () => {
        expect(typeof basketHooks.afterPOST).toBe('function');
        expect(() => basketHooks.afterPOST({})).not.toThrow();
    });
});
