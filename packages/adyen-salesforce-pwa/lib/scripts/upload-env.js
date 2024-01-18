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

    // Environment Variables Constraints
    // https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/managed-runtime-administration.html#constraints
    const reservedPrefixes = ['AWS', 'MRT', 'X_MRT', 'MOBIFY', 'X_MOBIFY', 'SSR_PROXY', 'NODE']
    const reservedNames = [
        'PROJECT_ID',
        'ENVIRONMENT_ID',
        'BUNDLE_ID',
        'DEPLOY_ID',
        'DEPLOY_TARGET',
        'EXTERNAL_DOMAIN_NAME',
        'HANDLER',
        'LAMBDA_RUNTIME_DIR',
        'LAMBDA_TASK_ROOT',
        'NODE_ENV',
        'REDIRECT_BUCKET',
        'REDIRECT_KEY',
        'REDIRECT_UPDATE',
        'REMOTE',
        'X_AMZN_TRACE_ID'
    ]

    const warnings = []
    const env = result.parsed
    const envParsed = Object.fromEntries(
        Object.entries(env).reduce((items, item) => {
            const [name, value] = item
            const isExceedlength = name.length >= 512
            const isReservedPrefix = reservedPrefixes.some((prefix) => name.startsWith(prefix))
            const isReservedName = reservedNames.includes(name)

            if (!value) {
                warnings.push(`Ignore environment name ${name}, its value can not be blank`)
            } else if (isExceedlength) {
                warnings.push(`Ignore environment name ${name}, it exceeds variable name length`)
            } else if (isReservedPrefix) {
                warnings.push(`Ignore environment name ${name}, it uses a reserved prefix name`)
            } else if (isReservedName) {
                warnings.push(`Ignore environment name ${name}, it uses a reserved name`)
            } else {
                items.push([name, {value}])
            }

            return items
        }, [])
    )

    if (Object.keys(envParsed).length > 0) {
        const credentials = await readCredentials(getCredentialsFile(DEFAULT_CLOUD_ORIGIN))
        const opts = {credentials, projectID: env.PROJECT_ID, environmentID: env.ENVIRONMENT_ID}
        const client = new CloudAPIClientCustom(opts)
        const data = await client.pushEnv(envParsed)

        warnings.push(...(data.warnings || []))
    }

    if (warnings.length > 0) {
        console.log('Warnings:', warnings.map((warn) => `\n    - ${warn}`).join(''))
    }

    console.log('env vars uploaded!')
})()
