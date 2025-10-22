const Logger = require('dw/system/Logger');

exports.fatal_log = function (msg, error) {
    const logMsg = [msg, error?.toString(), error?.stack].join('\n').trim();
    Logger.getLogger('Adyen_fatal', 'Adyen').fatal(logMsg);
}

exports.error_log = function (msg, error) {
    const logMsg = [msg, error?.toString(), error?.stack].join('\n').trim();
    Logger.getLogger('Adyen_error', 'Adyen').error(logMsg);
}

exports.debug_log = function (msg) {
    Logger.getLogger('Adyen_debug', 'Adyen').debug(msg);
}

exports.info_log = function (msg) {
    Logger.getLogger('Adyen_info', 'Adyen').info(msg);
}

