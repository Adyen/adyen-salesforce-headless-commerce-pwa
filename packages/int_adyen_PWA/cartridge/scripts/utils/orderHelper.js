const OrderMgr = require('dw/order/OrderMgr');
const Currency = require('dw/util/Currency');
const Transaction = require('dw/system/Transaction');
const Status = require('dw/system/Status');
const AdyenLogs = require('*/cartridge/scripts/logs/adyenCustomLogs');

/**
 * Attempts to place the order
 * @param {dw.order.Order} order - The order object to be placed
 * @param {Object} fraudDetectionStatus - an Object returned by the fraud detection hook
 * @returns {Object} an error object
 */
function placeOrder(order, fraudDetectionStatus) {
    const result = {error: false};
    try {
        Transaction.wrap(function () {
            const placeOrderStatus = OrderMgr.placeOrder(order);
            AdyenLogs.info_log(`PlaceOrder called for order ${order.orderNo} with status ${JSON.stringify(placeOrderStatus.getCode())}`);
            if (placeOrderStatus.getCode() === Status.ERROR) {
                throw new Error(`PlaceOrder called for order ${order.orderNo} with status ${JSON.stringify(placeOrderStatus)}`);
            }
        });
    } catch (e) {
        AdyenLogs.error_log('Failed to place order', e);
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
        result.error = true;
    }

    return result;
}

// converts the currency value for the Adyen Checkout API
function getCurrencyValueForApi(amount) {
    const currencyCode =
        Currency.getCurrency(amount.currencyCode) ||
        session.currency.currencyCode;
    const digitsNumber = getFractionDigits(
        currencyCode.toString(),
    );
    const value = Math.round(amount.multiply(10 ** digitsNumber).value); // eslint-disable-line no-restricted-properties
    return new dw.value.Money(value, currencyCode);
}

// get the divisor based on the currency code used to convert amounts of currency for the Adyen Checkout API
function getDivisorForCurrency(amount) {
    let fractionDigits = getFractionDigits(amount.currencyCode);
    return Math.pow(10, fractionDigits);
}


// get the fraction digits based on the currency code used to convert amounts of currency for the Adyen Checkout API
function getFractionDigits(currencyCode) {
    let format;
    const currency = currencyCode || session.currency.currencyCode;
    switch (currency) {
        case 'CVE':
        case 'DJF':
        case 'GNF':
        case 'IDR':
        case 'JPY':
        case 'KMF':
        case 'KRW':
        case 'PYG':
        case 'RWF':
        case 'UGX':
        case 'VND':
        case 'VUV':
        case 'XAF':
        case 'XOF':
        case 'XPF':
            format = 0;
            break;
        case 'BHD':
        case 'IQD':
        case 'JOD':
        case 'KWD':
        case 'LYD':
        case 'OMR':
        case 'TND':
            format = 3;
            break;
        default:
            format = 2;
            break;
    }
    return format;
}

module.exports = {
    placeOrder,
    getCurrencyValueForApi,
    getDivisorForCurrency
};
