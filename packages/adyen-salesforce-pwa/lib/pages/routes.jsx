import React from 'react'
import loadable from '@loadable/component'

// Components
import {Skeleton} from '@chakra-ui/react'

const fallback = <Skeleton height="75vh" width="100%" />

// Create your pages here and add them to the routes array
// Use loadable to split code into smaller js chunks
const Checkout = loadable(() => import('./checkout'), {fallback})
const CheckoutConfirmation = loadable(() => import('./checkout/confirmation'), {
    fallback
})
const AdyenCheckoutError = loadable(() => import('./checkout/error'), {fallback})

const routes = [
    {
        path: '/checkout',
        component: Checkout,
        exact: true
    },
    {
        path: '/checkout/error',
        component: AdyenCheckoutError
    },
    {
        path: '/checkout/confirmation/:orderNo',
        component: CheckoutConfirmation
    }
]

export default routes
