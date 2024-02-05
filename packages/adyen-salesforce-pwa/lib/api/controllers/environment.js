import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'

async function getEnvironment(req, res, next) {
    const adyenConfig = getAdyenConfigForCurrentSite(req.query.siteId)
    res.locals.response = {
        ADYEN_CLIENT_KEY: adyenConfig.clientKey,
        ADYEN_ENVIRONMENT: adyenConfig.environment
    }
    next()
}

export default getEnvironment
