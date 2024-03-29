/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useEffect, useState} from 'react'
import {Alert, AlertIcon, Box, Container, Grid, GridItem, Stack} from '@chakra-ui/react'
import {
    CheckoutProvider,
    useCheckout
} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import ContactInfo from '@salesforce/retail-react-app/app/pages/checkout/partials/contact-info'
import ShippingAddress from '@salesforce/retail-react-app/app/pages/checkout/partials/shipping-address'
import ShippingOptions from '@salesforce/retail-react-app/app/pages/checkout/partials/shipping-options'
import OrderSummary from '@salesforce/retail-react-app/app/components/order-summary'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import PropTypes from 'prop-types'

/* -----------------Adyen Begin ------------------------ */
import Payment from './partials/payment'
import {AdyenCheckoutProvider} from '@adyen/adyen-salesforce-pwa'
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import {
    useAccessToken,
    useCustomerId,
    useCustomerType,
    useShopperBasketsMutation
} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
/* -----------------Adyen End ------------------------ */

const Checkout = ({useShopperBasketsMutation}) => {
    const {step} = useCheckout()
    const [error] = useState()
    const {data: basket} = useCurrentBasket()

    useEffect(() => {
        if (error || step === 4) {
            window.scrollTo({top: 0})
        }
    }, [error, step])

    return (
        <Box background="gray.50" flex="1">
            <Container
                data-testid="sf-checkout-container"
                maxWidth="container.xl"
                py={{base: 7, lg: 16}}
                px={{base: 0, lg: 8}}
            >
                <Grid templateColumns={{base: '1fr', lg: '66% 1fr'}} gap={{base: 10, xl: 20}}>
                    <GridItem>
                        <Stack spacing={4}>
                            {error && (
                                <Alert status="error" variant="left-accent">
                                    <AlertIcon />
                                    {error}
                                </Alert>
                            )}

                            <ContactInfo />
                            <ShippingAddress />
                            <ShippingOptions />
                            <Payment useShopperBasketsMutation={useShopperBasketsMutation} />
                        </Stack>
                    </GridItem>

                    <GridItem py={6} px={[4, 4, 4, 0]}>
                        <OrderSummary
                            basket={basket}
                            showTaxEstimationForm={false}
                            showCartItems={true}
                        />
                    </GridItem>
                </Grid>
            </Container>
        </Box>
    )
}

/**
 * Customize Adyen Checkout
 * - Translations
 * - Payment Methods
 * - Execute Callbacks
 */

const checkoutCustomizations = {
    paymentMethodsConfiguration: {
        klarna_account: {
            useKlarnaWidget: false
        }
    }
}

const CheckoutContainer = () => {
    return (
        <AdyenCheckoutProvider
            useAccessToken={useAccessToken}
            useCustomerId={useCustomerId}
            useCustomerType={useCustomerType}
            useMultiSite={useMultiSite}
            adyenConfig={checkoutCustomizations}
        >
            <CheckoutProvider>
                <Checkout useShopperBasketsMutation={useShopperBasketsMutation} />
            </CheckoutProvider>
        </AdyenCheckoutProvider>
    )
}

Checkout.propTypes = {
    useShopperBasketsMutation: PropTypes.any
}

CheckoutContainer.propTypes = {
    children: PropTypes.any,
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any,
    useShopperBasketsMutation: PropTypes.any,
    useMultiSite: PropTypes.any,
    adyenConfig: PropTypes.any
}

export default CheckoutContainer
