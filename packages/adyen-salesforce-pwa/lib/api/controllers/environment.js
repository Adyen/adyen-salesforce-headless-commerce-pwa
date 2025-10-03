import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../models/logger'

async function getEnvironment(req, res, next) {
    Logger.info('getEnvironment', 'start')
    try {
        const adyenConfig = getAdyenConfigForCurrentSite(req.query.siteId)
        res.locals.response = {
            ADYEN_CLIENT_KEY: adyenConfig.clientKey,
            ADYEN_ENVIRONMENT: adyenConfig.environment
        }
        Logger.info('getEnvironment', 'success')
        next()
    } catch (err) {
        Logger.error('getEnvironment', err.stack)
        next(err)
    }
}

export default getEnvironment
