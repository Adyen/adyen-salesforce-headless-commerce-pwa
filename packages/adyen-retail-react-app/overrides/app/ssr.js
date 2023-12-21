/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'path'
import {getRuntime} from '@salesforce/pwa-kit-runtime/ssr/server/express'
import {isRemote} from '@salesforce/pwa-kit-runtime/utils/ssr-server'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import helmet from 'helmet'
import bodyParser from 'body-parser'
/* -----------------Adyen Begin ------------------------ */
import {registerAdyenEndpoints} from '@adyen/adyen-salesforce-pwa/dist/ssr/index.js'
/* -----------------Adyen End ------------------------ */
const options = {
    // The build directory (an absolute path)
    buildDir: path.resolve(process.cwd(), 'build'),

    // The cache time for SSR'd pages (defaults to 600 seconds)
    defaultCacheTimeSeconds: 600,

    // This is the value of the 'mobify' object from package.json
    mobify: getConfig(),

    // The port that the local dev server listens on
    port: 3000,

    // The protocol on which the development Express app listens.
    // Note that http://localhost is treated as a secure context for development.
    protocol: 'http'
}

const runtime = getRuntime()

const {handler} = runtime.createHandler(options, (app) => {
    app.use(bodyParser.json())
    /* -----------------Adyen Begin ------------------------ */
    // Set HTTP security headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'img-src': [
                        "'self'",
                        '*.commercecloud.salesforce.com',
                        'data:',
                        '*.adyen.com',
                        '*.paypal.com',
                        '*.media-amazon.com',
                        '*.payments-amazon.com',
                        'https://www.paypalobjects.com/js-sdk-logos/2.2.7/paypal-blue.svg',
                        'https://*.cash.app',
                        'https://*.gstatic.com'
                    ],
                    'script-src': [
                        "'self'",
                        "'unsafe-eval'",
                        'storage.googleapis.com',
                        '*.paypal.com',
                        '*.payments-amazon.com',
                        'https://x.klarnacdn.net/kp/lib/v1/api.js',
                        'https://static-eu.payments-amazon.com/checkout.js',
                        'https://sandbox.src.mastercard.com/sdk/srcsdk.mastercard.js',
                        'https://sandbox-assets.secure.checkout.visa.com/checkout-widget/resources/js/src-i-adapter/visa-sdk.js?v2',
                        'https://pay.google.com/gp/p/js/pay.js',
                        'https://*.cash.app',
                        'https://*.checkout.visa.com',
                        'https://*.mastercard.com'
                    ],
                    'connect-src': [
                        "'self'",
                        'api.cquotient.com',
                        '*.adyen.com',
                        '*.amazon.com',
                        'https://www.sandbox.paypal.com/xoplatform/logger/api/logger?disableSetCookie=true'
                    ],
                    'frame-src': ["'self'", '*.adyen.com', '*.paypal.com'],
                    /* -----------------Adyen End ------------------------ */
                    // Do not upgrade insecure requests for local development
                    'upgrade-insecure-requests': isRemote() ? [] : null
                }
            },
            hsts: isRemote()
        })
    )

    // Handle the redirect from SLAS as to avoid error
    app.get('/callback?*', (req, res) => {
        res.send()
    })
    app.get('/robots.txt', runtime.serveStaticFile('static/robots.txt'))

    app.get('/favicon.ico', runtime.serveStaticFile('static/ico/favicon.ico'))

    app.get('/worker.js(.map)?', runtime.serveServiceWorker)
    /* -----------------Adyen Begin ------------------------ */
    /**
     * Adyen API Endpoints
     * - Environment
     * - Payment Methods
     * - Payments
     * - Payments Details
     * - Webhooks
     *
     * @param app - express app used to register the routes
     * @param runtime - express runtime used to render pages after sanitizing the query params
     * @param overrides (optional) - an object that provides the option for using different endpoint handlers
     *
     * @example
     * const overrides = {
     *   payments: [PrePaymentsController, PaymentsController, PostPaymentsController],
     *   webhook: [
     *      authenticate,
     *      validateHmac,
     *      parseNotification,
     *      authorizationWebhookHandler,
     *      donationWebhookHandler
     *  ]
     * }
     */
    registerAdyenEndpoints(app, runtime)
    /* -----------------Adyen End ------------------------ */
    app.get('*', runtime.render)
})
// SSR requires that we export a single handler function called 'get', that
// supports AWS use of the server that we created above.
// exports.get = handler

export const get = handler
