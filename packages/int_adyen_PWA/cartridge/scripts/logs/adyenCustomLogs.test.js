const Logger = require('dw/system/Logger');
const {fatal_log, error_log, debug_log, info_log} = require('./adyenCustomLogs');

describe('adyenCustomLogs', () => {
    it('fatal_log formats message with error and stack', () => {
        const error = new Error('boom');
        error.stack = 'stack-trace';

        fatal_log('Something failed', error);

        expect(Logger.getLogger).toHaveBeenCalledWith('Adyen_fatal', 'Adyen');
        expect(Logger.__logger.fatal).toHaveBeenCalledWith(
            'Something failed\nError: boom\nstack-trace'
        );
    });

    it('fatal_log tolerates a missing error', () => {
        fatal_log('Something failed');

        expect(Logger.__logger.fatal).toHaveBeenCalledWith('Something failed');
    });

    it('error_log formats message with error and stack', () => {
        const error = new Error('boom');
        error.stack = 'stack-trace';

        error_log('Something failed', error);

        expect(Logger.getLogger).toHaveBeenCalledWith('Adyen_error', 'Adyen');
        expect(Logger.__logger.error).toHaveBeenCalledWith(
            'Something failed\nError: boom\nstack-trace'
        );
    });

    it('debug_log logs the raw message', () => {
        debug_log('debug message');

        expect(Logger.getLogger).toHaveBeenCalledWith('Adyen_debug', 'Adyen');
        expect(Logger.__logger.debug).toHaveBeenCalledWith('debug message');
    });

    it('info_log logs the raw message', () => {
        info_log('info message');

        expect(Logger.getLogger).toHaveBeenCalledWith('Adyen_info', 'Adyen');
        expect(Logger.__logger.info).toHaveBeenCalledWith('info message');
    });
});
