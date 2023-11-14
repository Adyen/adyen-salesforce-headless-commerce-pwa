async function getEnvironment(req, res) {
    res.json({
        ADYEN_CLIENT_KEY: process.env.ADYEN_CLIENT_KEY,
        ADYEN_ENVIRONMENT: process.env.ADYEN_ENVIRONMENT
    })
}

export default getEnvironment
