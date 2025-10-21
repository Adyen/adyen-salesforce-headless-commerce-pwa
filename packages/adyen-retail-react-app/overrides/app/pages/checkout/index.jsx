/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useEffect, useState} from 'react'
import {useIntl} from 'react-intl'
import {
    Alert,
    AlertIcon,
    Box,
    Container,
    Grid,
    GridItem,
    Stack
} from '@salesforce/retail-react-app/app/components/shared/ui'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {
    CheckoutProvider,
    useCheckout
} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import ContactInfo from '@salesforce/retail-react-app/app/pages/checkout/partials/contact-info'
import PickupAddress from '@salesforce/retail-react-app/app/pages/checkout/partials/pickup-address'
import ShippingAddress from '@salesforce/retail-react-app/app/pages/checkout/partials/shipping-address'
import ShippingMethods from '@salesforce/retail-react-app/app/pages/checkout/partials/shipping-methods'
import OrderSummary from '@salesforce/retail-react-app/app/components/order-summary'
import {useCurrentCustomer} from '@salesforce/retail-react-app/app/hooks/use-current-customer'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import CheckoutSkeleton from '@salesforce/retail-react-app/app/pages/checkout/partials/checkout-skeleton'
import {
    useAccessToken,
    useCustomerId,
    useCustomerType,
    useShopperBasketsMutation
} from '@salesforce/commerce-sdk-react'
import UnavailableProductConfirmationModal from '@salesforce/retail-react-app/app/components/unavailable-product-confirmation-modal'
import {
    API_ERROR_MESSAGE,
    TOAST_MESSAGE_REMOVED_ITEM_FROM_CART
} from '@salesforce/retail-react-app/app/constants'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {useMultiship} from '@salesforce/retail-react-app/app/hooks/use-multiship'

/* -----------------Adyen Begin ------------------------ */
import Payment from './partials/payment'
import {AdyenCheckoutProvider, pageTypes} from '@adyen/adyen-salesforce-pwa'
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
/* -----------------Adyen End ------------------------ */

const Checkout = () => {
    const {step} = useCheckout()
    const [error] = useState()
    const {data: basket, derivedData} = useCurrentBasket()
    const {passwordless = {}, social = {}} = getConfig().app.login || {}
    const idps = social?.idps
    const isSocialEnabled = !!social?.enabled
    const isPasswordlessEnabled = !!passwordless?.enabled
    const {removeEmptyShipments} = useMultiship(basket)
    const multishipEnabled = getConfig()?.app?.multishipEnabled ?? true

    // cart has both pickup and delivery orders
    const isDeliveryAndPickupOrder =
        multishipEnabled &&
        derivedData?.totalPickupShipments > 0 &&
        derivedData?.totalDeliveryShipments > 0

    // Check if there are pickup shipments
    const hasPickupShipments = derivedData?.totalPickupShipments > 0

    // Only enable BOPIS functionality if the feature toggle is on
    const isPickupOrderOnly = !isDeliveryAndPickupOrder && hasPickupShipments

    useEffect(() => {
        if (error || step === 4) {
            window.scrollTo({top: 0})
        }
    }, [error, step])

    // Remove any empty shipments whenever navigating to the checkout page
    // Using basketId ensures that the basket is in a valid state before removing empty shipments
    useEffect(() => {
        if (basket?.shipments?.length > 1) {
            removeEmptyShipments(basket)
        }
    }, [basket?.basketId])

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

                            <ContactInfo
                                isSocialEnabled={isSocialEnabled}
                                isPasswordlessEnabled={isPasswordlessEnabled}
                                idps={idps}
                            />

                            {isPickupOrderOnly ? (
                                <PickupAddress />
                            ) : (
                                <>
                                    {hasPickupShipments && <PickupAddress />}
                                    <ShippingAddress />
                                    <ShippingMethods />
                                </>
                            )}
                            <Payment />
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
        klarna: {
            useKlarnaWidget: false
        },
        klarna_account: {
            useKlarnaWidget: false
        }
    },
    translations: {
        'fr-CH': {
            'form.instruction': 'hello world'
        }
    }
}

const CheckoutContainer = () => {
    const customerId = useCustomerId()
    const customerTypeData = useCustomerType()
    const {getTokenWhenReady} = useAccessToken()
    const navigate = useNavigation()
    const {locale, site} = useMultiSite()
    const {data: customer} = useCurrentCustomer()
    const {data: basket} = useCurrentBasket()
    const {formatMessage} = useIntl()
    const removeItemFromBasketMutation = useShopperBasketsMutation('removeItemFromBasket')
    const toast = useToast()
    const [isDeletingUnavailableItem, setIsDeletingUnavailableItem] = useState(false)
    const [authToken, setAuthToken] = useState()

    useEffect(() => {
        const getToken = async () => {
            const token = await getTokenWhenReady()
            setAuthToken(token)
        }

        getToken()
    }, [])

    if (!authToken) {
        return
    }

    const handleRemoveItem = async (product) => {
        await removeItemFromBasketMutation.mutateAsync(
            {
                parameters: {basketId: basket.basketId, itemId: product.itemId}
            },
            {
                onSuccess: () => {
                    toast({
                        title: formatMessage(TOAST_MESSAGE_REMOVED_ITEM_FROM_CART, {quantity: 1}),
                        status: 'success'
                    })
                },
                onError: () => {
                    toast({
                        title: formatMessage(API_ERROR_MESSAGE),
                        status: 'error'
                    })
                }
            }
        )
    }
    const handleUnavailableProducts = async (unavailableProductIds) => {
        setIsDeletingUnavailableItem(true)
        const productItems = basket?.productItems?.filter((item) =>
            unavailableProductIds?.includes(item.productId)
        )
        for (let item of productItems) {
            await handleRemoveItem(item)
        }
        setIsDeletingUnavailableItem(false)
    }

    if (!customer || !customer.customerId || !basket || !basket.basketId) {
        return <CheckoutSkeleton />
    }

    return (
        <AdyenCheckoutProvider
            authToken={authToken}
            customerId={customerId}
            isCustomerRegistered={customerTypeData?.isRegistered}
            locale={locale}
            site={site}
            basket={basket}
            navigate={navigate}
            adyenConfig={checkoutCustomizations}
            page={pageTypes.CHECKOUT}
        >
            <CheckoutProvider>
                {isDeletingUnavailableItem && <LoadingSpinner wrapperStyles={{height: '100vh'}} />}

                <Checkout />
                <UnavailableProductConfirmationModal
                    productItems={basket?.productItems}
                    handleUnavailableProducts={handleUnavailableProducts}
                />
            </CheckoutProvider>
        </AdyenCheckoutProvider>
    )
}

export default CheckoutContainer
