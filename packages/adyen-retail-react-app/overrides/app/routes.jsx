/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React from 'react'
import loadable from '@loadable/component'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {configureRoutes} from '@salesforce/retail-react-app/app/utils/routes-utils'
import {routes as _routes} from '@salesforce/retail-react-app/app/routes'
import {Skeleton} from '@salesforce/retail-react-app/app/components/shared/ui'

const fallback = <Skeleton height="75vh" width="100%" />

// Base pages needed to replicate the vanilla dynamic and catch-all routing behavior
const Login = loadable(() => import('@salesforce/retail-react-app/app/pages/login'), {fallback})
const ResetPassword = loadable(
    () => import('@salesforce/retail-react-app/app/pages/reset-password'),
    {fallback}
)
const SocialLoginRedirect = loadable(
    () => import('@salesforce/retail-react-app/app/pages/social-login-redirect'),
    {fallback}
)
const PageNotFound = loadable(() => import('@salesforce/retail-react-app/app/pages/page-not-found'))

/* -----------------Adyen Begin ------------------------ */
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'

// Checkout page from Adyen
const Checkout = loadable(() => import('./pages/checkout'), {fallback})

// CheckoutConfirmation page from Adyen
const CheckoutConfirmation = loadable(() => import('./pages/checkout/confirmation'), {fallback})

// Checkout Redirect page from Adyen
const AdyenCheckoutRedirect = loadable(() => import('./pages/checkout/redirect'), {fallback})

// Checkout Error page from Adyen
const AdyenCheckoutError = loadable(() => import('./pages/checkout/error'), {fallback})

// Checkout Review page from Adyen
const CheckoutReview = loadable(() => import('./pages/checkout/review'), {fallback})

// Cart page from Adyen
const Cart = loadable(() => import('./pages/cart'), {fallback})

// Override the base checkout, confirmation and cart routes with the Adyen versions
const adyenRouteOverrides = {
    '/checkout': {path: '/checkout', component: Checkout, exact: true},
    '/checkout/confirmation/:orderNo': {
        path: '/checkout/confirmation/:orderNo',
        component: CheckoutConfirmation
    },
    '/cart': {path: '/cart', component: Cart, exact: true}
}

const routes = [
    // Additional Adyen-only checkout routes
    {path: '/checkout/redirect', component: AdyenCheckoutRedirect},
    {path: '/checkout/error', component: AdyenCheckoutError},
    {path: '/checkout/review', component: CheckoutReview, exact: true},
    // Keep every base route, swapping in the Adyen components where applicable
    ..._routes.map((route) => adyenRouteOverrides[route.path] || route)
]
/* -----------------Adyen End ------------------------ */

export default () => {
    const config = getConfig()
    const loginConfig = config?.app?.login
    const resetPasswordLandingPath = loginConfig?.resetPassword?.landingPath
    const socialLoginEnabled = loginConfig?.social?.enabled
    const socialRedirectURI = loginConfig?.social?.redirectURI
    const passwordlessLoginEnabled = loginConfig?.passwordless?.enabled
    const passwordlessLoginLandingPath = loginConfig?.passwordless?.landingPath

    // Add dynamic routes conditionally (only if features are enabled and paths are defined)
    const dynamicRoutes = [
        resetPasswordLandingPath && {
            path: resetPasswordLandingPath,
            component: ResetPassword,
            exact: true
        },
        passwordlessLoginEnabled &&
            passwordlessLoginLandingPath && {
                path: passwordlessLoginLandingPath,
                component: Login,
                exact: true
            },
        socialLoginEnabled &&
            socialRedirectURI && {
                path: socialRedirectURI,
                component: SocialLoginRedirect,
                exact: true
            }
    ].filter(Boolean)

    const allRoutes = configureRoutes([...routes, ...dynamicRoutes], config, {
        ignoredRoutes: ['/callback'],
        fuzzyPathMatching: true
    })

    // Add catch-all route at the end so it doesn't match before dynamic routes
    return [...allRoutes, {path: '*', component: PageNotFound}]
}
