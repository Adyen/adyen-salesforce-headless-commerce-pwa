module.exports = {
    apiKey: process.env.ADYEN_API_KEY,
    clientKey: process.env.ADYEN_CLIENT_KEY,
    environment: process.env.ADYEN_ENVIRONMENT,
    merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
    systemIntegratorName: process.env.SYSTEM_INTEGRATOR_NAME,
    webhookUser: process.env.ADYEN_WEBHOOK_USER,
    webhookPassword: process.env.ADYEN_WEBHOOK_PASSWORD,
    webhookHmacKey: process.env.ADYEN_HMAC_KEY
}
