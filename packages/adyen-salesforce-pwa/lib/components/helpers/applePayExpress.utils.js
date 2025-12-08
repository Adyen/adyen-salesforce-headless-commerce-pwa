import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {AdyenPaymentsService} from '../../services/payments'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenTemporaryBasketService} from '../../services/temporary-basket'
import {AdyenAddProductService} from '../../services/add-product'
import {PAYMENT_TYPES} from '../../utils/constants.mjs'

export const getApplePaymentMethodConfig = (paymentMethodsResponse) => {
    const applePayPaymentMethod = paymentMethodsResponse?.paymentMethods?.find(
        (pm) => pm.type === 'applepay'
    )
    return applePayPaymentMethod?.configuration || null
}

export const getCustomerShippingDetails = (shippingContact) => {
    return {
        deliveryAddress: {
            city: shippingContact.locality,
            country: shippingContact.countryCode,
            houseNumberOrName:
                shippingContact.addressLines?.length > 1 ? shippingContact.addressLines[1] : '',
            postalCode: shippingContact.postalCode,
            stateOrProvince: shippingContact.administrativeArea,
            street: shippingContact.addressLines?.[0]
        },
        profile: {
            firstName: shippingContact.givenName,
            lastName: shippingContact.familyName,
            email: shippingContact.emailAddress,
            phone: shippingContact.phoneNumber
        }
    }
}

export const getCustomerBillingDetails = (billingContact) => {
    return {
        billingAddress: {
            city: billingContact.locality,
            country: billingContact.countryCode,
            houseNumberOrName:
                billingContact?.addressLines?.length > 1 ? billingContact.addressLines[1] : '',
            postalCode: billingContact.postalCode,
            stateOrProvince: billingContact.administrativeArea,
            street: billingContact.addressLines?.[0]
        }
    }
}

export const getAppleButtonConfig = (
    authToken,
    site,
    basket,
    shippingMethods,
    applePayConfig,
    navigate,
    fetchShippingMethods,
    onError = [],
    isExpressPdp = false,
    merchantDisplayName = '',
    customerId,
    product
) => {
    let applePayAmount = basket.orderTotal
    let customerData = null
    let billingData = null
    let temporaryBasket = null
    const buttonConfig = {
        showPayButton: true,
        isExpress: true,
        configuration: applePayConfig,
        amount: {
            value: getCurrencyValueForApi(basket.orderTotal, basket.currency),
            currency: basket.currency
        },
        requiredShippingContactFields: ['postalAddress', 'name', 'phoneticName', 'email', 'phone'],
        requiredBillingContactFields: ['postalAddress'],
        shippingMethods: shippingMethods?.map((sm) => ({
            label: sm.name,
            detail: sm.description,
            identifier: sm.id,
            amount: `${sm.price}`
        })),
        onSubmit: async (state, component, actions) => {
            try {
                const basketData = isExpressPdp ? temporaryBasket : basket
                const adyenPaymentService = new AdyenPaymentsService(
                    authToken,
                    basketData?.customerInfo?.customerId,
                    basketData?.basketId,
                    site
                )
                const paymentsResponse = await adyenPaymentService.submitPayment({
                    paymentType: isExpressPdp ? PAYMENT_TYPES.EXPRESS_PDP : PAYMENT_TYPES.EXPRESS,
                    ...state.data,
                    ...getCustomerBillingDetails(billingData),
                    ...getCustomerShippingDetails(customerData),
                    origin: state.data.origin ? state.data.origin : window.location.origin
                })
                if (paymentsResponse?.isFinal && paymentsResponse?.isSuccessful) {
                    const finalPriceUpdate = {
                        newTotal: {
                            type: 'final',
                            label: merchantDisplayName || applePayConfig.merchantName,
                            amount: `${applePayAmount}`
                        }
                    }
                    actions.resolve(finalPriceUpdate)
                    navigate(`/checkout/confirmation/${paymentsResponse?.merchantReference}`)
                } else {
                    actions.reject()
                }
            } catch (err) {
                onError.forEach((cb) => cb(err))
                actions.reject(err)
            }
        },
        onAuthorized: (data, actions) => {
            const {authorizedEvent} = data
            try {
                customerData = authorizedEvent.payment.shippingContact
                billingData = authorizedEvent.payment.billingContact
                actions.resolve()
            } catch (err) {
                onError.forEach((cb) => cb(err))
                actions.reject(err)
            }
        },
        onShippingContactSelected: async (resolve, reject, event) => {
            try {
                const {shippingContact} = event
                const basketData = isExpressPdp ? temporaryBasket : basket
                const adyenShippingAddressService = new AdyenShippingAddressService(
                    authToken,
                    basketData?.customerInfo?.customerId,
                    basketData?.basketId,
                    site
                )
                const customerShippingDetails = getCustomerShippingDetails(shippingContact)
                await adyenShippingAddressService.updateShippingAddress(customerShippingDetails)
                const {defaultShippingMethodId, applicableShippingMethods} =
                    await fetchShippingMethods(basketData?.basketId)
                if (!applicableShippingMethods?.length) {
                    reject()
                } else {
                    const adyenShippingMethodsService = new AdyenShippingMethodsService(
                        authToken,
                        basketData?.customerInfo?.customerId,
                        basketData?.basketId,
                        site
                    )
                    const response = await adyenShippingMethodsService.updateShippingMethod(
                        defaultShippingMethodId
                            ? defaultShippingMethodId
                            : applicableShippingMethods[0].id
                    )
                    buttonConfig.amount = {
                        value: getCurrencyValueForApi(response.orderTotal, response.currency),
                        currency: response.currency
                    }
                    applePayAmount = response.orderTotal
                    const finalPriceUpdate = {
                        newShippingMethods: [...applicableShippingMethods]
                            .sort((a, b) => {
                                if (a.id === defaultShippingMethodId) {
                                    return -1
                                } else if (b.id === defaultShippingMethodId) {
                                    return 1
                                }
                                return 0
                            })
                            .map((sm) => ({
                                label: sm.name,
                                detail: sm.description,
                                identifier: sm.id,
                                amount: `${sm.price}`
                            })),
                        newTotal: {
                            type: 'final',
                            label: merchantDisplayName || applePayConfig.merchantName,
                            amount: `${applePayAmount}`
                        }
                    }
                    resolve(finalPriceUpdate)
                }
            } catch (err) {
                onError.forEach((cb) => cb(err))
                reject(err)
            }
        },
        onShippingMethodSelected: async (resolve, reject, event) => {
            try {
                const {shippingMethod} = event
                const basketData = isExpressPdp ? temporaryBasket : basket
                const adyenShippingMethodsService = new AdyenShippingMethodsService(
                    authToken,
                    basketData?.customerInfo?.customerId,
                    basketData?.basketId,
                    site
                )
                const response = await adyenShippingMethodsService.updateShippingMethod(
                    shippingMethod.identifier
                )
                if (response.error) {
                    reject()
                } else {
                    buttonConfig.amount = {
                        value: getCurrencyValueForApi(response.orderTotal, response.currency),
                        currency: response.currency
                    }
                    applePayAmount = response.orderTotal
                    const applePayShippingMethodUpdate = {
                        newTotal: {
                            type: 'final',
                            label: merchantDisplayName || applePayConfig.merchantName,
                            amount: `${applePayAmount}`
                        }
                    }
                    resolve(applePayShippingMethodUpdate)
                }
            } catch (err) {
                onError.forEach((cb) => cb(err))
                reject(err)
            }
        },
        onClick: async (resolve, reject) => {
            if (isExpressPdp) {
                const adyenTemporaryBasketService = new AdyenTemporaryBasketService(
                    authToken,
                    customerId,
                    site
                )
                temporaryBasket = await adyenTemporaryBasketService.createTemporaryBasket()
                if (temporaryBasket?.basketId) {
                    const adyenAddProductService = new AdyenAddProductService(
                        authToken,
                        customerId,
                        site,
                        temporaryBasket.basketId
                    )
                    const updatedBasket = await adyenAddProductService.addProductToBasket(product)
                    applePayAmount = updatedBasket.orderTotal
                    const applePayAmountUpdate = {
                        newTotal: {
                            type: 'final',
                            label: merchantDisplayName || applePayConfig.merchantName,
                            amount: updatedBasket.orderTotal
                        }
                    }
                    resolve(applePayAmountUpdate)
                } else {
                    reject()
                }
            } else {
                resolve()
            }
        }
    }
    return buttonConfig
}
