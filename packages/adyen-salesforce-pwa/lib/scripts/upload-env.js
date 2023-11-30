#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
// this script uploads environment variables to mrt
// before using it run 'save-credentials' in retail-react-app
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
    const envParsed = Object.fromEntries(
        Object.entries(env).map((item) => {
            return [
                item[0],
                {
                    value: item[1]
                }
            ]
        })
    )
    const credentials = await readCredentials(getCredentialsFile(DEFAULT_CLOUD_ORIGIN))
    const opts = {credentials, projectID: env.PROJECT_ID, environmentID: env.ENVIRONMENT_ID}
    const client = new CloudAPIClientCustom(opts)
    const data = await client.pushEnv(envParsed)
    const warnings = data.warnings || []
    warnings.forEach((warn) => console.log(warn))
    console.log('env vars uploaded!')
})()
