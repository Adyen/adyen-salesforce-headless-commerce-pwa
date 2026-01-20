import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {AdyenPaymentsService} from '../../services/payments'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenTemporaryBasketService} from '../../services/temporary-basket'
import {PAYMENT_TYPES} from '../../utils/constants.mjs'
import {executeErrorCallbacks} from '../../utils/executeCallbacks'
import {PaymentCancelExpressService} from '../../services/payment-cancel-express'

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

export const getAppleButtonConfig = (props = {}) => {
    const {
        token: authToken,
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
    } = props

    let applePayAmount = basket.orderTotal
    let customerData = null
    let billingData = null
    let temporaryBasket = null
    let currentBasket = basket

    const getBasket = () => currentBasket
    const setBasket = (newBasket) => {
        currentBasket = newBasket
    }

    const propsWithGetBasket = {...props, getBasket, setBasket}

    const errorHandler = (error, component) => onErrorHandler(error, component, propsWithGetBasket)
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
                const basketData = isExpressPdp ? temporaryBasket : currentBasket
                const adyenPaymentService = new AdyenPaymentsService(
                    authToken,
                    customerId,
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
                const basketData = isExpressPdp ? temporaryBasket : currentBasket
                const adyenShippingAddressService = new AdyenShippingAddressService(
                    authToken,
                    customerId,
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
                        customerId,
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
                const basketData = isExpressPdp ? temporaryBasket : currentBasket
                const adyenShippingMethodsService = new AdyenShippingMethodsService(
                    authToken,
                    customerId,
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
                temporaryBasket = await adyenTemporaryBasketService.createTemporaryBasket(product)
                if (temporaryBasket?.basketId) {
                    setBasket(temporaryBasket)
                    applePayAmount = temporaryBasket.orderTotal
                    const applePayAmountUpdate = {
                        newTotal: {
                            type: 'final',
                            label: merchantDisplayName || applePayConfig.merchantName,
                            amount: temporaryBasket.orderTotal
                        }
                    }
                    resolve(applePayAmountUpdate)
                } else {
                    reject()
                }
            } else {
                resolve()
            }
        },
        onError: executeErrorCallbacks([...onError, errorHandler], propsWithGetBasket),
        onPaymentFailed: executeErrorCallbacks([...onError, errorHandler], propsWithGetBasket)
    }
    return buttonConfig
}

/**
 * Handles errors during Apple Pay Express checkout.
 * Cancels the express payment, cleans up the basket, removes shipping method and address,
 * and redirects to checkout page with error flag.
 *
 * @param {Error} error - The error that occurred
 * @param {object} component - Adyen component instance
 * @param {object} props - Component properties
 * @param {string} props.token - Authentication token
 * @param {object} props.basket - Shopping basket object
 * @param {string} props.customerId - Customer ID
 * @param {object} props.site - Site configuration
 * @param {Function} props.navigate - Navigation function
 * @returns {Promise<object>} Object indicating cancellation status
 */
export const onErrorHandler = async (error, component, props) => {
    try {
        const basket = props.getBasket()
        const paymentCancelExpressService = new PaymentCancelExpressService(
            props.token,
            props.customerId,
            basket?.basketId,
            props.site
        )
        await paymentCancelExpressService.paymentCancelExpress()
        props.navigate(`/checkout?error=true`)
        return {cancelled: true}
    } catch (err) {
        console.error('Error during express payment cancellation:', err)
        return {cancelled: false, error: err.message}
    }
}
