/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const sites = require('./sites.js')

module.exports = {
    app: {
        // Customize how your 'site' and 'locale' are displayed in the url.
        url: {
            // Determine where the siteRef is located. Valid values include 'path|query_param|none'. Defaults to: 'none'
            site: 'path',
            // Determine where the localeRef is located. Valid values include 'path|query_param|none'. Defaults to: 'none'
            locale: 'path',
            // This boolean value dictates whether or not default site or locale values are shown in the url. Defaults to: false
            showDefaults: true
        },
        // The default site for your app. This value will be used when a siteRef could not be determined from the url
        defaultSite: process.env.COMMERCE_API_DEFAULT_SITE,
        // Provide aliases for your sites. These will be used in place of your site id when generating paths throughout the application.
        siteAliases: {
            RefArch: 'RefArch'
        },
        // The sites for your app, which is imported from sites.js
        sites,
        // Commerce api config
        commerceAPI: {
            proxyPath: '/mobify/proxy/api',
            parameters: {
                clientId: process.env.COMMERCE_API_CLIENT_ID,
                organizationId: process.env.COMMERCE_API_ORG_ID,
                shortCode: process.env.COMMERCE_API_SHORT_CODE,
                siteId: process.env.COMMERCE_API_SITE_ID
            }
        },
        // Einstein api config
        einsteinAPI: {
            host: 'https://api.cquotient.com',
            einsteinId: '',
            siteId: '',
            // Flag Einstein activities as coming from a production environment.
            // By setting this to true, the Einstein activities generated by the environment will appear
            // in production environment reports
            isProduction: false
        },
        dataCloudAPI: {}
    },
    // This list contains server-side only libraries that you don't want to be compiled by webpack
    externals: [],
    // Page not found url for your app
    pageNotFoundURL: '/page-not-found',
    // Enables or disables building the files necessary for server-side rendering.
    ssrEnabled: true,
    // This list determines which files are available exclusively to the server-side rendering system
    // and are not available through the /mobify/bundle/ path.
    ssrOnly: ['ssr.js', 'ssr.js.map', 'node_modules/**/*.*'],
    // This list determines which files are available to the server-side rendering system
    // and available through the /mobify/bundle/ path.
    ssrShared: [
        'static/ico/favicon.ico',
        'static/robots.txt',
        '**/*.js',
        '**/*.js.map',
        '**/*.json'
    ],
    // Additional parameters that configure Express app behavior.
    ssrParameters: {
        ssrFunctionNodeVersion: '18.x',
        proxyConfigs: [
            {
                host: process.env.SCAPI_URL,
                path: 'api'
            },
            {
                host: process.env.OCAPI_URL,
                path: 'ocapi'
            }
        ]
    }
}
