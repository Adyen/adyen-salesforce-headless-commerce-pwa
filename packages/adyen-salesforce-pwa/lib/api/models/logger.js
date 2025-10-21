import {APPLICATION_VERSION} from '../../utils/constants.mjs'

const ADYEN_PREFIX = 'ADYEN'

class Logger {
    static info(step, message) {
        console.info(composeLog('INFO', step, message))
    }

    static warn(step, message) {
        console.warn(composeLog('WARN', step, message))
    }

    static error(step, message) {
        console.error(composeLog('ERROR', step, message))
    }

    static debug(step, message) {
        console.debug(composeLog('DEBUG', step, message))
    }
}

const composeLog = (type, step, message) => {
    const logMessage = message instanceof Object ? JSON.stringify(message) : message
    return `${ADYEN_PREFIX}_${type} ${APPLICATION_VERSION} ${step ? step : ''} ${
        logMessage ? logMessage : ''
    }`
        .trim()
        .replace(/\s\s+/g, ' ')
}

export default Logger
