const ENV_TO_CONFIG_MAP = {
    ADYEN_API_KEY: 'apiKey',
    ADYEN_CLIENT_KEY: 'clientKey',
    ADYEN_ENVIRONMENT: 'environment',
    ADYEN_MERCHANT_ACCOUNT: 'merchantAccount',
    SYSTEM_INTEGRATOR_NAME: 'systemIntegratorName',
    ADYEN_WEBHOOK_USER: 'webhookUser',
    ADYEN_WEBHOOK_PASSWORD: 'webhookPassword',
    ADYEN_HMAC_KEY: 'webhookHmacKey',
    ADYEN_LIVE_URL_PREFIX: 'liveEndpointUrlPrefix',
    ADYEN_APPLE_DOMAIN_ASSOCIATION: 'appleDomainAssociation',
    ADYEN_NATIVE_3DS: 'nativeThreeDS',
    GIFT_CARD_EXPIRATION_TIME: 'giftCardExpirationTime',
    ADYEN_L23_ENABLED: 'l23Enabled',
    ADYEN_L23_COMMODITY_CODE: 'l23CommodityCode'
}

export const getAdyenConfigForCurrentSite = (currentSiteId, options = {}) => {
    return Object.fromEntries(
        Object.entries(ENV_TO_CONFIG_MAP).map(([envKey, configKey]) => [
            configKey,
            resolveConfigValue(currentSiteId, envKey, options)
        ])
    )
}

const resolveConfigValue = (siteId, key, options) => {
    const siteSpecificKey = siteId ? `${siteId}_${key}` : key

    // Priority: site-specific (options > env) > global (options > env)
    return (
        options[siteSpecificKey] ??
        process.env[siteSpecificKey] ??
        options[key] ??
        process.env[key] ??
        undefined
    )
}
