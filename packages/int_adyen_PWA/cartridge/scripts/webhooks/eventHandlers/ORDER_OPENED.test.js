const Logger = require('dw/system/Logger');
const {handle} = require('./ORDER_OPENED');

describe('ORDER_OPENED event handler', () => {
    it('logs a message when the webhook was successful', () => {
        const order = {orderNo: 'ORDER-1'};
        const customObj = {custom: {success: 'true'}};

        handle({order, customObj});

        expect(Logger.__logger.info).toHaveBeenCalledWith(
            'Order ORDER-1 opened for partial payments'
        );
    });

    it('does not log when the webhook was unsuccessful', () => {
        const order = {orderNo: 'ORDER-1'};
        const customObj = {custom: {success: 'false'}};

        handle({order, customObj});

        expect(Logger.__logger.info).not.toHaveBeenCalled();
    });
});
