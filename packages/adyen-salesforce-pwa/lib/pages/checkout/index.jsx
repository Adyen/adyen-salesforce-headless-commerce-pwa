/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useEffect, useState} from 'react'
import {useLocation} from 'react-router-dom'
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
import Payment from './partials/payment'
import {AdyenCheckoutProvider} from '../../context/adyen-checkout-context'
import AdyenCheckout from '../../components/adyenCheckout'
import PropTypes from 'prop-types'

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

const CheckoutChildren = ({useShopperBasketsMutation}) => {
    const location = useLocation()
    return location?.search?.includes('redirectResult') ? (
        <AdyenCheckout />
    ) : (
        <Checkout useShopperBasketsMutation={useShopperBasketsMutation} />
    )
}

const CheckoutContainer = ({
    useAccessToken,
    useCustomerId,
    useCustomerType,
    useShopperBasketsMutation,
    adyenConfig
}) => {
    return (
        <AdyenCheckoutProvider
            useAccessToken={useAccessToken}
            useCustomerId={useCustomerId}
            useCustomerType={useCustomerType}
            adyenConfig={adyenConfig}
        >
            <CheckoutProvider>
                <CheckoutChildren useShopperBasketsMutation={useShopperBasketsMutation} />
            </CheckoutProvider>
        </AdyenCheckoutProvider>
    )
}

Checkout.propTypes = {
    useShopperBasketsMutation: PropTypes.any
}

CheckoutChildren.propTypes = {
    useShopperBasketsMutation: PropTypes.any
}

CheckoutContainer.propTypes = {
    children: PropTypes.any,
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any,
    useShopperBasketsMutation: PropTypes.any,
    adyenConfig: PropTypes.any
}

export default CheckoutContainer
