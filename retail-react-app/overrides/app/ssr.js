/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const path = require('path')
const {getRuntime} = require('@salesforce/pwa-kit-runtime/ssr/server/express')
const {isRemote} = require('@salesforce/pwa-kit-runtime/utils/ssr-server')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')
const helmet = require('helmet')
const express = require('express');
const bodyParser = require('body-parser');
const {Client, Config, CheckoutAPI} = require('@adyen/api-library');

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
    app.use(bodyParser.json());

    const config = new Config();
    config.apiKey = //REPLACE With YOUR API KEY
    const client = new Client({ config });
    client.setEnvironment("TEST");
    const checkout = new CheckoutAPI(client);

    app.post("/sessions", async (req, res) => {
      try {
        const orderRef = 'ref1'; //todo: Replace with a proper value
        const amount = req.body?.amount;

        const response = await checkout.sessions({
          countryCode: "NL",
          amount: amount,
          reference: orderRef,
          merchantAccount: //todo: REPLACE With YOUR MERCHANT ACCOUNT
          returnUrl: //todo: REPLACE with a proper value  // required for 3ds2 redirect flow
        });
        console.log(JSON.stringify(response));

        res.json([response, orderRef]); // sending a tuple with orderRef as well to inform about the unique order reference
      } catch (err) {
        console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
        res.status(err.statusCode).json(err.message);
      }
    });

    // Set HTTP security headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'img-src': ["'self'", '*.commercecloud.salesforce.com', 'data:'],
                    'script-src': ["'self'", "'unsafe-eval'", 'storage.googleapis.com'],
                    'connect-src': ["'self'", 'api.cquotient.com'],

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

})
// SSR requires that we export a single handler function called 'get', that
// supports AWS use of the server that we created above.
exports.get = handler
