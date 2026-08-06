const Logger = require('dw/system/Logger');
const {handle} = require('./PENDING');

describe('PENDING event handler', () => {
    it('logs the pending status and returns pending: true', () => {
        const order = {orderNo: 'ORDER-1'};

        const result = handle({order});

        expect(result).toEqual({pending: true});
        expect(Logger.__logger.info).toHaveBeenCalledWith(
            'Order ORDER-1 was in pending status.'
        );
    });
});
