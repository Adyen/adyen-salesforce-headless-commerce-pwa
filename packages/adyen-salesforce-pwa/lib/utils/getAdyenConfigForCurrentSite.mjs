import Logger from "../api/controllers/logger.js";

export const getAdyenConfigForCurrentSite = (currentSiteId) => {
    return {
        apiKey: setProperty(currentSiteId, ADYEN_ENV.ADYEN_API_KEY, true),
        clientKey: setProperty(currentSiteId, ADYEN_ENV.ADYEN_CLIENT_KEY, true),
        environment: setProperty(currentSiteId, ADYEN_ENV.ADYEN_ENVIRONMENT, true),
        merchantAccount: setProperty(currentSiteId, ADYEN_ENV.ADYEN_MERCHANT_ACCOUNT, true),
        systemIntegratorName: setProperty(currentSiteId, ADYEN_ENV.SYSTEM_INTEGRATOR_NAME, false),
        webhookUser: setProperty(currentSiteId, ADYEN_ENV.ADYEN_WEBHOOK_USER, false),
        webhookPassword: setProperty(currentSiteId, ADYEN_ENV.ADYEN_WEBHOOK_PASSWORD, Object.hasOwn(process.env, `${currentSiteId}_${ADYEN_ENV.ADYEN_WEBHOOK_USER}`)),
        webhookHmacKey: setProperty(currentSiteId, ADYEN_ENV.ADYEN_HMAC_KEY, false)
    }
}

const setProperty = (currentSiteId, property, isRequired) => {
    const siteEnv = `${currentSiteId}_${property}`
    if (Object.hasOwn(process.env, siteEnv)) {
        return process.env[siteEnv]
    } else if (isRequired) {
        const errorMessage = `${currentSiteId}_${property} is not defined in environment variables`
        Logger.error('SET ADYEN CONFIG FOR SITE', errorMessage)
        throw new Error(errorMessage)
    }
    return ''
}

const ADYEN_ENV = {
    ADYEN_API_KEY: 'ADYEN_API_KEY',
    ADYEN_CLIENT_KEY: 'ADYEN_CLIENT_KEY',
    ADYEN_ENVIRONMENT: 'ADYEN_ENVIRONMENT',
    ADYEN_MERCHANT_ACCOUNT: 'ADYEN_MERCHANT_ACCOUNT',
    SYSTEM_INTEGRATOR_NAME: 'SYSTEM_INTEGRATOR_NAME',
    ADYEN_WEBHOOK_USER: 'ADYEN_WEBHOOK_USER',
    ADYEN_WEBHOOK_PASSWORD: 'ADYEN_WEBHOOK_PASSWORD',
    ADYEN_HMAC_KEY: 'ADYEN_HMAC_KEY'
}
