import Logger from '../models/logger'
import {AdyenError} from "../models/AdyenError";
import {ERROR_MESSAGE} from "../../utils/constants.mjs";

async function getEnvironment(req, res, next) {
    Logger.info('getEnvironment', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)

        }
        res.locals.response = {
            ADYEN_CLIENT_KEY: adyenContext.adyenConfig?.clientKey,
            ADYEN_ENVIRONMENT: adyenContext.adyenConfig?.environment
        }
        Logger.info('getEnvironment', 'success')
        next()
    } catch (err) {
        Logger.error('getEnvironment', err.stack)
        next(err)
    }
}

export default getEnvironment
