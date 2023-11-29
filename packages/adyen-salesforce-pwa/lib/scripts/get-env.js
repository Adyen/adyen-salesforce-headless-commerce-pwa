/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'
const {
    readCredentials,
    DEFAULT_CLOUD_ORIGIN,
    getCredentialsFile
} = require('@salesforce/pwa-kit-dev/utils/script-utils')
const {CloudAPIClientCustom} = require('./cloudAPICilent')
const dotenv = require('dotenv')
;(async function () {
    const result = dotenv.config()

    if (result.error) {
        throw result.error
    }

    const env = result.parsed
    const credentials = await readCredentials(getCredentialsFile(DEFAULT_CLOUD_ORIGIN))
    const opts = {credentials, projectID: env.PROJECT_ID, environmentID: env.ENVIRONMENT_ID}
    const client = new CloudAPIClientCustom(opts)
    const data = await client.getEnv()
    const warnings = data.warnings || []
    warnings.forEach((warn) => console.log(warn))
    console.log('env vars fetched!', data)
})()
