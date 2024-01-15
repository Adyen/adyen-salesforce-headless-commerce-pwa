import {getSiteConfig} from '../../utils/getConfig.mjs'

async function getEnvironment(req, res, next) {
    const adyenConfig = getSiteConfig('adyen')
    res.locals.response = {
        ADYEN_CLIENT_KEY: adyenConfig.clientKey,
        ADYEN_ENVIRONMENT: adyenConfig.environment
    }
    next()
}

export default getEnvironment
