import createLogger from '@salesforce/pwa-kit-runtime/utils/logger-factory'
import packageJson from '../../../package.json'

const loggerInstance = Object.freeze(createLogger({packageName: packageJson.name}))

class Logger {
    static info(step, message) {
        loggerInstance.info(composeLog(step, message))
    }

    static warn(step, message) {
        loggerInstance.warn(composeLog(step, message))
    }

    static error(step, message) {
        loggerInstance.error(composeLog(step, message))
    }

    static debug(step, message) {
        loggerInstance.debug(composeLog(step, message))
    }
}

const composeLog = (step, message) => {
    const logMessage = message instanceof Object ? JSON.stringify(message) : message
    return `${packageJson.version} ${step ? step : ''} ${logMessage ? logMessage : ''}`
        .trim()
        .replace(/\s\s+/g, ' ')
}

export default Logger
