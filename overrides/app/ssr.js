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
import EndToEndSetupController from '../../adyen/controllers/e2e-setup'
import PaymentMethodsController from '../../adyen/controllers/payment-methods'
import PaymentsDetailsController from '../../adyen/controllers/payments-details'
import PaymentsController from '../../adyen/controllers/payments'
import {
    authenticate,
    errorHandler,
    handleWebhook,
    validateHmac
} from '../../adyen/controllers/webhook'

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
                        'https://www.paypalobjects.com/js-sdk-logos/2.2.7/paypal-blue.svg'
                    ],
                    'script-src': [
                        "'self'",
                        "'unsafe-eval'",
                        'storage.googleapis.com',
                        '*.paypal.com',
                        'https://x.klarnacdn.net/kp/lib/v1/api.js',
                        'https://static-eu.payments-amazon.com/checkout.js',
                        'https://sandbox.src.mastercard.com/sdk/srcsdk.mastercard.js',
                        'https://sandbox-assets.secure.checkout.visa.com/checkout-widget/resources/js/src-i-adapter/visa-sdk.js?v2',
                        'https://pay.google.com/gp/p/js/pay.js'
                    ],
                    'connect-src': [
                        "'self'",
                        'api.cquotient.com',
                        '*.adyen.com',
                        'https://www.sandbox.paypal.com/xoplatform/logger/api/logger?disableSetCookie=true'
                    ],
                    'frame-src': ["'self'", '*.adyen.com', '*.paypal.com'],

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
    app.get('*', runtime.render)

    // Routes
    app.post('/api/adyen/e2e-setup', EndToEndSetupController)
    app.post('/api/adyen/paymentMethods', PaymentMethodsController)
    app.post('/api/adyen/payments/details', PaymentsDetailsController)
    app.post('/api/adyen/payments', PaymentsController)
    app.post('/api/adyen/webhook', authenticate, validateHmac, handleWebhook, errorHandler)
})
// SSR requires that we export a single handler function called 'get', that
// supports AWS use of the server that we created above.
// exports.get = handler

export const get = handler
