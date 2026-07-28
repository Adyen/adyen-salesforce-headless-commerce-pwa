const Order = require('dw/order/Order');
const Money = require('dw/value/Money');

/**
 * Installs fresh SFCC "bare global" stand-ins (dw, session, request, PIPELET_*)
 * that the cartridge scripts reference without an explicit require().
 */
function installDefaultGlobals() {
    global.dw = {
        order: {Order},
        value: {Money}
    };
    global.session = {
        currency: {currencyCode: 'USD'},
        setCurrency: jest.fn()
    };
    global.request = {
        httpPath: '',
        httpParameterMap: {
            requestBodyAsString: ''
        }
    };
    global.PIPELET_NEXT = 'PIPELET_NEXT';
    global.PIPELET_ERROR = 'PIPELET_ERROR';
}

module.exports = {installDefaultGlobals};
