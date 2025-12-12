/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useEffect, useMemo, useState} from 'react'
import {FormattedMessage} from 'react-intl'
import {
    Box,
    Button,
    Container,
    Divider,
    Grid,
    GridItem,
    Heading,
    Stack,
    Text
} from '@salesforce/retail-react-app/app/components/shared/ui'
import {CheckoutProvider} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import OrderSummary from '@salesforce/retail-react-app/app/components/order-summary'
import {useCurrentCustomer} from '@salesforce/retail-react-app/app/hooks/use-current-customer'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import CheckoutSkeleton from '@salesforce/retail-react-app/app/pages/checkout/partials/checkout-skeleton'
import AddressDisplay from '@salesforce/retail-react-app/app/components/address-display'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useAdyenReviewPage} from '@adyen/adyen-salesforce-pwa'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'

const Review = () => {
    const {data: basket} = useCurrentBasket()
    const customerId = useCustomerId()
    const {getTokenWhenReady} = useAccessToken()
    const {site} = useMultiSite()
    const navigate = useNavigation()
    const showToast = useToast()

    const [authToken, setAuthToken] = useState()

    const shippingAddress = basket?.shipments?.[0]?.shippingAddress
    const billingAddress = basket?.billingAddress
    const shippingMethod = basket?.shipments?.[0]?.shippingMethod
    const paymentMethod = useMemo(() => {
        try {
            return basket?.c_paymentMethod ? JSON.parse(basket.c_paymentMethod) : null
        } catch {
            return null
        }
    }, [basket?.c_paymentMethod])

    useEffect(() => {
        const getToken = async () => {
            const token = await getTokenWhenReady()
            setAuthToken(token)
        }
        getToken()
    }, [])

    const {isLoading, isSubmitting, paymentData, error, submitPaymentDetails} = useAdyenReviewPage({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site,
        skip: !authToken || !basket?.basketId
    })

    useEffect(() => {
        if (error) {
            showToast({
                title: 'Failed to load payment data',
                status: 'error'
            })
        }
    }, [error])

    const handlePlaceOrder = async () => {
        if (!paymentData) return

        try {
            const response = await submitPaymentDetails()

            if (response?.isSuccessful && response?.isFinal) {
                navigate(`/checkout/confirmation/${response?.merchantReference}`)
            } else {
                showToast({
                    title: 'Payment failed. Please try again.',
                    status: 'error'
                })
            }
        } catch (err) {
            showToast({
                title: err.message || 'An error occurred while processing your order',
                status: 'error'
            })
        }
    }

    if (isLoading) {
        return <LoadingSpinner wrapperStyles={{height: '100vh'}} />
    }

    return (
        <Box background="gray.50" flex="1">
            <Container
                data-testid="sf-review-container"
                maxWidth="container.xl"
                py={{base: 7, lg: 16}}
                px={{base: 0, lg: 8}}
            >
                <Grid templateColumns={{base: '1fr', lg: '66% 1fr'}} gap={{base: 10, xl: 20}}>
                    <GridItem>
                        <Stack spacing={6}>
                            <Heading as="h1" fontSize="2xl">
                                <FormattedMessage
                                    defaultMessage="Review Your Order"
                                    id="review.heading.review_order"
                                />
                            </Heading>

                            {/* Contact Info */}
                            <Box
                                background="white"
                                borderRadius="base"
                                border="1px solid"
                                borderColor="gray.100"
                                p={6}
                            >
                                <Heading as="h2" fontSize="lg" mb={4}>
                                    <FormattedMessage
                                        defaultMessage="Contact Information"
                                        id="review.heading.contact_info"
                                    />
                                </Heading>
                                <Text>{basket?.customerInfo?.email}</Text>
                            </Box>

                            {/* Shipping Address */}
                            {shippingAddress && (
                                <Box
                                    background="white"
                                    borderRadius="base"
                                    border="1px solid"
                                    borderColor="gray.100"
                                    p={6}
                                >
                                    <Heading as="h2" fontSize="lg" mb={4}>
                                        <FormattedMessage
                                            defaultMessage="Shipping Address"
                                            id="review.heading.shipping_address"
                                        />
                                    </Heading>
                                    <AddressDisplay address={shippingAddress} />
                                </Box>
                            )}

                            {/* Shipping Method */}
                            {shippingMethod && (
                                <Box
                                    background="white"
                                    borderRadius="base"
                                    border="1px solid"
                                    borderColor="gray.100"
                                    p={6}
                                >
                                    <Heading as="h2" fontSize="lg" mb={4}>
                                        <FormattedMessage
                                            defaultMessage="Shipping Method"
                                            id="review.heading.shipping_method"
                                        />
                                    </Heading>
                                    <Text fontWeight="semibold">{shippingMethod.name}</Text>
                                    {shippingMethod.description && (
                                        <Text color="gray.600" fontSize="sm">
                                            {shippingMethod.description}
                                        </Text>
                                    )}
                                </Box>
                            )}

                            {/* Billing Address */}
                            {billingAddress && (
                                <Box
                                    background="white"
                                    borderRadius="base"
                                    border="1px solid"
                                    borderColor="gray.100"
                                    p={6}
                                >
                                    <Heading as="h2" fontSize="lg" mb={4}>
                                        <FormattedMessage
                                            defaultMessage="Billing Address"
                                            id="review.heading.billing_address"
                                        />
                                    </Heading>
                                    <AddressDisplay address={billingAddress} />
                                </Box>
                            )}

                            {/* Payment Method */}
                            <Box
                                background="white"
                                borderRadius="base"
                                border="1px solid"
                                borderColor="gray.100"
                                p={6}
                            >
                                <Heading as="h2" fontSize="lg" mb={4}>
                                    <FormattedMessage
                                        defaultMessage="Payment Method"
                                        id="review.heading.payment_method"
                                    />
                                </Heading>
                                <Text fontWeight="semibold" textTransform="capitalize">
                                    {paymentMethod?.type || 'Unknown'}
                                </Text>
                            </Box>

                            <Divider />

                            {/* Place Order Button */}
                            <Button
                                colorScheme="blue"
                                size="lg"
                                width="full"
                                onClick={handlePlaceOrder}
                                isLoading={isSubmitting}
                                isDisabled={!paymentData}
                            >
                                <FormattedMessage
                                    defaultMessage="Place Order"
                                    id="review.button.place_order"
                                />
                            </Button>
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

const ReviewContainer = () => {
    const {data: customer} = useCurrentCustomer()
    const {data: basket} = useCurrentBasket()

    if (!customer || !customer.customerId || !basket || !basket.basketId) {
        return <CheckoutSkeleton />
    }

    return (
        <CheckoutProvider>
            <Review />
        </CheckoutProvider>
    )
}

export default ReviewContainer
