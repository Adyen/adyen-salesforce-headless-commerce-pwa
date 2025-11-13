/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useEffect, useMemo, useState} from 'react'
import PropTypes from 'prop-types'
import {defineMessage, FormattedMessage, useIntl} from 'react-intl'
import {
    Box,
    Checkbox,
    Divider,
    Heading,
    Stack,
    Text
} from '@salesforce/retail-react-app/app/components/shared/ui'
import {useForm} from 'react-hook-form'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import {useShopperBasketsMutation} from '@salesforce/commerce-sdk-react'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {useCheckout} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import {getCreditCardIcon} from '@salesforce/retail-react-app/app/utils/cc-utils'
import {ToggleCard, ToggleCardEdit} from '@salesforce/retail-react-app/app/components/toggle-card'
import ShippingAddressSelection from '@salesforce/retail-react-app/app/pages/checkout/partials/shipping-address-selection'
import AddressDisplay from '@salesforce/retail-react-app/app/components/address-display'
import {PromoCode, usePromoCode} from '@salesforce/retail-react-app/app/components/promo-code'
import {API_ERROR_MESSAGE} from '@salesforce/retail-react-app/app/constants'
import {isPickupShipment} from '@salesforce/retail-react-app/app/utils/shipment-utils'
/* -----------------Adyen Begin ------------------------ */
import {useAccessToken, useCustomerId, useCustomerType} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import {AdyenCheckout, pageTypes} from '@adyen/adyen-salesforce-pwa'
/* -----------------Adyen End ------------------------ */

const Payment = () => {
    const {formatMessage} = useIntl()
    const {data: basket} = useCurrentBasket()
    const customerId = useCustomerId()
    const customerTypeData = useCustomerType()
    const {getTokenWhenReady} = useAccessToken()
    const navigate = useNavigation()
    const {locale, site} = useMultiSite()
    const [authToken, setAuthToken] = useState()

    useEffect(() => {
        const getToken = async () => {
            const token = await getTokenWhenReady()
            setAuthToken(token)
        }

        getToken()
    }, [])

    const isPickupOnly =
        basket?.shipments?.length > 0 &&
        basket.shipments.every((shipment) => isPickupShipment(shipment))
    const selectedShippingAddress = useMemo(() => {
        if (!basket?.shipments?.length || isPickupOnly) return null
        const deliveryShipment = basket.shipments.find((shipment) => !isPickupShipment(shipment))
        return deliveryShipment?.shippingAddress || null
    }, [basket?.shipments, isPickupShipment, isPickupOnly])

    const selectedBillingAddress = basket?.billingAddress
    const [billingSameAsShipping, setBillingSameAsShipping] = useState(!isPickupOnly)

    useEffect(() => {
        if (isPickupOnly) {
            setBillingSameAsShipping(false)
        }
    }, [isPickupOnly])

    const {mutateAsync: updateBillingAddressForBasket} = useShopperBasketsMutation(
        'updateBillingAddressForBasket'
    )

    const showToast = useToast()
    const showError = () => {
        showToast({
            title: formatMessage(API_ERROR_MESSAGE),
            status: 'error'
        })
    }

    const {step, STEPS} = useCheckout()

    const billingAddressForm = useForm({
        mode: 'onChange',
        shouldUnregister: false,
        defaultValues: {...selectedBillingAddress}
    })

    // Using destructuring to remove properties from the object...
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {removePromoCode, ...promoCodeProps} = usePromoCode()

    const onBillingSubmit = async () => {
        const isFormValid = await billingAddressForm.trigger()

        if (!isFormValid) {
            return
        }
        const billingAddress = billingSameAsShipping
            ? selectedShippingAddress
            : billingAddressForm.getValues()
        // Using destructuring to remove properties from the object...
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {addressId, creationDate, lastModified, preferred, ...address} = billingAddress
        return await updateBillingAddressForBasket({
            body: address,
            parameters: {basketId: basket.basketId}
        })
    }

    const billingAddressAriaLabel = defineMessage({
        defaultMessage: 'Billing Address Form',
        id: 'checkout_payment.label.billing_address_form'
    })

    /**
     * Customize Adyen Checkout
     * - Translations
     * - Payment Methods
     * - Execute Callbacks
     */
    const paymentMethodsConfiguration = {
        klarna: {
            useKlarnaWidget: false
        },
        klarna_account: {
            useKlarnaWidget: false
        }
    }

    return (
        <ToggleCard
            id="step-3"
            title={formatMessage({defaultMessage: 'Payment', id: 'checkout_payment.title.payment'})}
            editing={step === STEPS.PAYMENT || step === STEPS.REVIEW_ORDER}
            isLoading={billingAddressForm.formState.isSubmitting}
        >
            <ToggleCardEdit>
                <Box mt={-2} mb={4}>
                    <PromoCode {...promoCodeProps} itemProps={{border: 'none'}} />
                </Box>

                <Stack spacing={6}>
                    <AdyenCheckout
                        // Required props
                        authToken={authToken}
                        site={site}
                        locale={locale}
                        navigate={navigate}
                        basket={basket}
                        // Optional
                        page={pageTypes.CHECKOUT}
                        customerId={customerId}
                        isCustomerRegistered={customerTypeData.isRegistered}
                        paymentMethodsConfiguration={paymentMethodsConfiguration}
                        // Callbacks
                        beforeSubmit={[onBillingSubmit]}
                        onError={[showError]}
                        // UI
                        spinner={<LoadingSpinner wrapperStyles={{height: '100vh'}} />}
                    />

                    <Divider borderColor="gray.100" />

                    <Stack spacing={2}>
                        <Heading as="h3" fontSize="md">
                            <FormattedMessage
                                defaultMessage="Billing Address"
                                id="checkout_payment.heading.billing_address"
                            />
                        </Heading>

                        {!isPickupOnly && (
                            <Checkbox
                                name="billingSameAsShipping"
                                isChecked={billingSameAsShipping}
                                onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                            >
                                <Text fontSize="sm" color="gray.700">
                                    <FormattedMessage
                                        defaultMessage="Same as shipping address"
                                        id="checkout_payment.label.same_as_shipping"
                                    />
                                </Text>
                            </Checkbox>
                        )}

                        {billingSameAsShipping && selectedShippingAddress && (
                            <Box pl={7}>
                                <AddressDisplay address={selectedShippingAddress} />
                            </Box>
                        )}
                    </Stack>

                    {!billingSameAsShipping && (
                        <ShippingAddressSelection
                            form={billingAddressForm}
                            selectedAddress={selectedBillingAddress}
                            formTitleAriaLabel={billingAddressAriaLabel}
                            hideSubmitButton
                            isBillingAddress
                        />
                    )}
                </Stack>
            </ToggleCardEdit>
        </ToggleCard>
    )
}

const PaymentCardSummary = ({payment}) => {
    const CardIcon = getCreditCardIcon(payment?.paymentCard?.cardType)
    return (
        <Stack direction="row" alignItems="center" spacing={3}>
            {CardIcon && <CardIcon layerStyle="ccIcon" />}

            <Stack direction="row">
                <Text>{payment.paymentCard.cardType}</Text>
                <Text>&bull;&bull;&bull;&bull; {payment.paymentCard.numberLastDigits}</Text>
                <Text>
                    {payment.paymentCard.expirationMonth}/{payment.paymentCard.expirationYear}
                </Text>
            </Stack>
        </Stack>
    )
}

PaymentCardSummary.propTypes = {payment: PropTypes.object}

export default Payment
