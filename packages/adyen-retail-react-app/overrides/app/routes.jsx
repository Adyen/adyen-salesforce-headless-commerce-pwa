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
import {Skeleton} from '@chakra-ui/react'

/* -----------------Adyen Begin ------------------------ */
// these hooks need to be passed to checkout page from Adyen
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import {
    AuthHelpers,
    useAccessToken,
    useAuthHelper,
    useCustomerId,
    useCustomerType,
    useOrder,
    useProducts,
    useShopperBasketsMutation
} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'

// Components
const fallback = <Skeleton height="75vh" width="100%" />

/**
 * Customize Adyen Checkout
 * - Translations
 * - Payment Methods
 * - Execute Callbacks
 *
 * const checkoutCustomizations = {
 *     beforeSubmit: [
 *         function logAfterSubmit() {
 *             console.log('before submit')
 *             return true
 *         }
 *     ],
 *     afterSubmit: [
 *         function logAfterSubmit() {
 *             console.log('after submit')
 *             return true
 *         }
 *     ],
 *     translations: {
 *         'en-US': {
 *             payButton: ''
 *         }
 *     },
 *     paymentMethodsConfiguration: {
 *         paypal: {
 *             style: {
 *                 layout: 'vertical',
 *                 color: 'blue'
 *             }
 *         }
 *     }
 * }
 */

// Create your pages here and add them to the routes array
// Use loadable to split code into smaller js chunks
// Checkout page from Adyen
const Checkout = loadable(() => import('@adyen/adyen-salesforce-pwa'), {
    fallback: fallback,
    resolveComponent: (components) => {
        return () => (
            <components.Checkout
                useAccessToken={useAccessToken}
                useCustomerId={useCustomerId}
                useCustomerType={useCustomerType}
                useShopperBasketsMutation={useShopperBasketsMutation}
                useMultiSite={useMultiSite}
                // adyenConfig={checkoutCustomizations}
            />
        )
    }
})

// CheckoutConfirmation page from Adyen
const CheckoutConfirmation = loadable(() => import('@adyen/adyen-salesforce-pwa'), {
    fallback: fallback,
    resolveComponent: (components) => {
        return () => (
            <components.CheckoutConfirmation
                useOrder={useOrder}
                useProducts={useProducts}
                useAuthHelper={useAuthHelper}
                AuthHelpers={AuthHelpers}
                useAccessToken={useAccessToken}
                useCustomerId={useCustomerId}
                useCustomerType={useCustomerType}
                useMultiSite={useMultiSite}
            />
        )
    }
})

// Checkout Redirect page from Adyen
const AdyenCheckoutRedirect = loadable(() => import('@adyen/adyen-salesforce-pwa'), {
    fallback: fallback,
    resolveComponent: (components) => {
        return () => (
            <components.AdyenCheckoutRedirect
                useAccessToken={useAccessToken}
                useCustomerId={useCustomerId}
                useCustomerType={useCustomerType}
                useMultiSite={useMultiSite}
            />
        )
    }
})

// Checkout Error page from Adyen
const AdyenCheckoutError = loadable(() => import('@adyen/adyen-salesforce-pwa'), {
    fallback: fallback,
    resolveComponent: (components) => {
        return () => <components.AdyenCheckoutError />
    }
})

const routes = [
    {
        path: '/checkout',
        component: Checkout,
        exact: true
    },
    {
        path: '/checkout/redirect',
        component: AdyenCheckoutRedirect
    },
    {
        path: '/checkout/error',
        component: AdyenCheckoutError
    },
    {
        path: '/checkout/confirmation/:orderNo',
        component: CheckoutConfirmation
    },
    ..._routes
]

/* -----------------Adyen End ------------------------ */
export default () => {
    const config = getConfig()
    return configureRoutes(routes, config, {
        ignoredRoutes: ['/callback', '*']
    })
}
