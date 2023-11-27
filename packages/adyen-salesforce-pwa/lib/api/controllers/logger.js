import {APPLICATION_VERSION} from '../../utils/constants.mjs'

const ADYEN_PREFIX = 'ADYEN'

class Logger {
    static info(step, message) {
        console.info(`${ADYEN_PREFIX}_INFO ${APPLICATION_VERSION} ${step} ${message}`)
    }

    static warn(step, message) {
        console.warn(`${ADYEN_PREFIX}_WARN ${APPLICATION_VERSION} ${step} ${message}`)
    }

    static error(step, message) {
        console.error(`${ADYEN_PREFIX}_ERROR ${APPLICATION_VERSION} ${step} ${message}`)
    }

    static debug(step, message) {
        console.debug(`${ADYEN_PREFIX}_DEBUG ${APPLICATION_VERSION} ${step} ${message}`)
    }
}

export default Logger
