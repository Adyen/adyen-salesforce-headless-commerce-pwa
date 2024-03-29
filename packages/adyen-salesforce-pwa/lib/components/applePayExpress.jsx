import React, {useEffect, useRef} from 'react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {Spinner, Flex} from '@chakra-ui/react'
import PropTypes from 'prop-types'
import {useAdyenExpressCheckout} from '../context/adyen-express-checkout-context'
import {getCurrencyValueForApi} from '../utils/parsers.mjs'
import {AdyenPaymentsService} from '../services/payments'
import {AdyenShippingMethodsService} from '../services/shipping-methods'

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
        // requiredShippingContactFields: ['postalAddress', 'name', 'phoneticName', 'phone', 'email'],
        requiredBillingContactFields: ['postalAddress'],
        shippingMethods: shippingMethods?.map((sm) => ({
            label: sm.name,
            detail: sm.description,
            identifier: sm.id,
            amount: `${sm.price}`
        })),
        onAuthorized: async (resolve, reject, event) => {
            const {billingContact, token} = event.payment
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
                                : null,
                        postalCode: billingContact.postalCode,
                        stateOrProvince: billingContact.administrativeArea,
                        street: billingContact.addressLines[0]
                    },
                    deliveryAddress: {
                        city: billingContact.locality,
                        country: billingContact.countryCode,
                        houseNumberOrName:
                            billingContact.addressLines.length > 1
                                ? billingContact.addressLines[1]
                                : null,
                        postalCode: billingContact.postalCode,
                        stateOrProvince: billingContact.administrativeArea,
                        street: billingContact.addressLines[0]
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
                basket?.customerId
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
        onSubmit: (state, component) => {
            // This handler is empty to prevent sending a second payment request
        },
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
        },
        onShippingContactSelected: async (resolve, reject, event) => {}
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
        navigate
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
                    props.shippingMethods,
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
        if (adyenEnvironment && adyenPaymentMethods && basket && paymentContainer.current) {
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
