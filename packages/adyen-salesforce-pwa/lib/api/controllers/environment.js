async function getEnvironment(req, res, next) {
    res.locals.response = {
        ADYEN_CLIENT_KEY: process.env.ADYEN_CLIENT_KEY,
        ADYEN_ENVIRONMENT: process.env.ADYEN_ENVIRONMENT
    }
    next()
}

export default getEnvironment
