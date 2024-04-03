import React, {useEffect, useRef} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {Spinner, Flex} from '@chakra-ui/react'
import PropTypes from 'prop-types'
import {getCurrencyValueForApi} from '../utils/parsers.mjs'
import {AdyenPaymentsService} from '../services/payments'
import {AdyenShippingMethodsService} from '../services/shipping-methods'
import useAdyenExpressCheckout from '../hooks/useAdyenExpressCheckout'

const getApplePaymentMethodConfig = (paymentMethodsResponse) => {
    const applePayPaymentMethod = paymentMethodsResponse?.paymentMethods?.find(
        (pm) => pm.type === 'applepay'
    )
    return applePayPaymentMethod?.configuration || null
}

const getAppleButtonConfig = (
    getTokenWhenReady,
    site,
    basket,
    shippingMethods,
    applePayConfig,
    navigate
) => {
    const amount = {
        value: getCurrencyValueForApi(basket.orderTotal, basket.currency),
        currency: basket.currency
    }
    const buttonConfig = {
        showPayButton: true,
        configuration: applePayConfig,
        amount,
        requiredShippingContactFields: ['postalAddress', 'email', 'phone'],
        requiredBillingContactFields: ['postalAddress'],
        shippingMethods: shippingMethods?.map((sm) => ({
            label: sm.name,
            detail: sm.description,
            identifier: sm.id,
            amount: `${sm.price}`
        })),
        onAuthorized: async (resolve, reject, event) => {
            const {shippingContact, billingContact, token} = event.payment
            const state = {
                data: {
                    paymentType: 'express',
                    paymentMethod: {
                        type: 'applepay',
                        applePayToken: token.paymentData
                    },
                    billingAddress: {
                        city: billingContact.locality,
                        country: billingContact.countryCode,
                        houseNumberOrName:
                            billingContact.addressLines.length > 1
                                ? billingContact.addressLines[1]
                                : '',
                        postalCode: billingContact.postalCode,
                        stateOrProvince: billingContact.administrativeArea,
                        street: billingContact.addressLines[0]
                    },
                    deliveryAddress: {
                        city: shippingContact.locality,
                        country: shippingContact.countryCode,
                        houseNumberOrName:
                            shippingContact.addressLines.length > 1
                                ? shippingContact.addressLines[1]
                                : '',
                        postalCode: shippingContact.postalCode,
                        stateOrProvince: shippingContact.administrativeArea,
                        street: shippingContact.addressLines[0]
                    },
                    profile: {
                        firstName: shippingContact.givenName,
                        lastName: shippingContact.familyName,
                        email: shippingContact.emailAddress,
                        phone: shippingContact.phoneNumber
                    }
                }
            }
            const commerceApiToken = await getTokenWhenReady()
            const adyenPaymentService = new AdyenPaymentsService(commerceApiToken, site)
            const paymentsResponse = await adyenPaymentService.submitPayment(
                {
                    ...state.data,
                    origin: state.data.origin ? state.data.origin : window.location.href
                },
                basket?.basketId,
                basket?.customerInfo?.customerId
            )
            if (paymentsResponse?.isFinal && paymentsResponse?.isSuccessful) {
                const finalPriceUpdate = {
                    newTotal: {
                        type: 'final',
                        label: applePayConfig.merchantName,
                        amount: `${amount.value}`
                    }
                }
                resolve(finalPriceUpdate)
                navigate(`/checkout/confirmation/${paymentsResponse?.merchantReference}`)
            } else {
                reject()
            }
        },
        onSubmit: () => {},
        onShippingMethodSelected: async (resolve, reject, event) => {
            try {
                const {shippingMethod} = event
                const commerceApiToken = await getTokenWhenReady()
                const adyenShippingMethodsService = new AdyenShippingMethodsService(
                    commerceApiToken,
                    site
                )
                const response = await adyenShippingMethodsService.updateShippingMethod(
                    shippingMethod.identifier,
                    basket.basketId
                )
                if (response.error) {
                    reject()
                } else {
                    buttonConfig.amount = {
                        value: getCurrencyValueForApi(response.orderTotal, response.currency),
                        currency: response.currency
                    }
                    const applePayShippingMethodUpdate = {
                        newTotal: {
                            type: 'final',
                            label: applePayConfig.merchantName,
                            amount: `${response.orderTotal}`
                        }
                    }
                    resolve(applePayShippingMethodUpdate)
                }
            } catch (err) {
                console.error(err)
                reject()
            }
        }
    }
    return buttonConfig
}

const ApplePayExpressComponent = (props) => {
    const {
        adyenEnvironment,
        adyenPaymentMethods,
        basket,
        locale,
        site,
        getTokenWhenReady,
        navigate,
        shippingMethods
    } = useAdyenExpressCheckout()
    const paymentContainer = useRef(null)

    useEffect(() => {
        const createCheckout = async () => {
            try {
                const checkout = await AdyenCheckout({
                    environment: adyenEnvironment?.ADYEN_ENVIRONMENT,
                    clientKey: adyenEnvironment?.ADYEN_CLIENT_KEY,
                    locale: locale.id
                })
                const applePaymentMethodConfig = getApplePaymentMethodConfig(adyenPaymentMethods)
                const appleButtonConfig = getAppleButtonConfig(
                    getTokenWhenReady,
                    site,
                    basket,
                    shippingMethods?.applicableShippingMethods,
                    applePaymentMethodConfig,
                    navigate
                )
                const applePayButton = await checkout.create('applepay', appleButtonConfig)
                const isApplePayButtonAvailable = await applePayButton.isAvailable()
                if (isApplePayButtonAvailable) {
                    applePayButton.mount(paymentContainer.current)
                }
            } catch (err) {
                console.log(err)
            }
        }
        if (
            adyenEnvironment &&
            adyenPaymentMethods &&
            basket &&
            shippingMethods &&
            paymentContainer.current
        ) {
            createCheckout()
        }
    }, [adyenEnvironment, adyenPaymentMethods])

    return (
        <>
            {props.showLoading && (
                <Flex align={'center'} justify={'center'}>
                    <Spinner size={'lg'} mt={4} />
                </Flex>
            )}
            <div ref={paymentContainer}></div>
        </>
    )
}

ApplePayExpressComponent.propTypes = {
    showLoading: PropTypes.bool,
    shippingMethods: PropTypes.array
}

export default ApplePayExpressComponent
