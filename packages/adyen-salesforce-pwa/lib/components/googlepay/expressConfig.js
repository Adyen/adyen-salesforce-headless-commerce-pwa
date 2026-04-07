import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenTemporaryBasketService} from '../../services/temporary-basket'
import {AdyenOrderNumberService} from '../../services/order-number'
import {PaymentCancelExpressService} from '../../services/payment-cancel-express'
import {executeErrorCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {PAYMENT_TYPES} from '../../utils/constants.mjs'

/**
 * Converts a Google Pay address object to the Adyen/SFCC delivery address format.
 *
 * @param {object} googlePayAddress - Address from Google Pay payment data
 * @param {string} googlePayAddress.countryCode - Country code
 * @param {string} googlePayAddress.postalCode - Postal code
 * @param {string} googlePayAddress.locality - City
 * @param {string} googlePayAddress.administrativeArea - State/province
 * @param {string} [googlePayAddress.address1] - Street line 1
 * @param {string} [googlePayAddress.address2] - Street line 2 / house number
 * @returns {object|null} Delivery address in Adyen/SFCC format
 */
export const getGooglePayDeliveryAddress = (googlePayAddress) => {
    if (!googlePayAddress) {
        return null
    }
    return {
        city: googlePayAddress.locality || '',
        country: googlePayAddress.countryCode || '',
        postalCode: googlePayAddress.postalCode || '',
        stateOrProvince: googlePayAddress.administrativeArea || '',
        street: googlePayAddress.address1 || '',
        houseNumberOrName: googlePayAddress.address2 || ''
    }
}

/**
 * Converts Google Pay payment data into Adyen/SFCC shopper details format.
 *
 * @param {object} googlePayPaymentData - Payment data from Google Pay's onAuthorized callback
 * @param {object} [googlePayPaymentData.shippingAddress] - Shipping address
 * @param {object} [googlePayPaymentData.paymentMethodData] - Payment method data
 * @param {object} [googlePayPaymentData.paymentMethodData.info] - Card info
 * @param {object} [googlePayPaymentData.paymentMethodData.info.billingAddress] - Billing address
 * @param {string} [googlePayPaymentData.email] - Shopper email
 * @returns {object} Shopper details object
 */
export const getGooglePayShopperDetails = (googlePayPaymentData) => {
    const deliveryAddress = getGooglePayDeliveryAddress(googlePayPaymentData?.shippingAddress)
    const billingAddress = getGooglePayDeliveryAddress(
        googlePayPaymentData?.paymentMethodData?.info?.billingAddress
    )
    return {
        deliveryAddress,
        billingAddress,
        profile: {
            email: googlePayPaymentData?.email || '',
            firstName: googlePayPaymentData?.shippingAddress?.name?.split(' ')[0] || '',
            lastName:
                googlePayPaymentData?.shippingAddress?.name?.split(' ').slice(1).join(' ') || '',
            phone: googlePayPaymentData?.shippingAddress?.phoneNumber || ''
        }
    }
}

/**
 * Creates the Google Pay Express configuration object for Adyen Checkout.
 *
 * @param {object} [props={}] - Configuration properties
 * @param {string} props.token - Authentication token
 * @param {string} props.customerId - Customer ID
 * @param {object} props.basket - Shopping basket object
 * @param {object} props.site - Site configuration
 * @param {object} props.locale - Locale object
 * @param {Function} props.navigate - Navigation function
 * @param {Function} props.fetchShippingMethods - Function to fetch applicable shipping methods
 * @param {Function[]} [props.onError] - Error handler callbacks
 * @param {object} [props.configuration] - Additional Google Pay configuration overrides
 * @param {string} [props.type='cart'] - Express checkout type: 'pdp' or 'cart'
 * @param {object} [props.product] - Product object (required when type is 'pdp')
 * @param {string} [props.merchantDisplayName=''] - Merchant display name shown in payment sheet
 * @returns {object} Google Pay Express configuration object for Adyen Checkout
 */
export const getGooglePayExpressConfig = (props = {}) => {
    const {onError = [], configuration = {}, type = 'cart', merchantDisplayName = ''} = props

    const isPdp = type === 'pdp'
    let currentBasket = props.basket
    let shopperData = null
    let temporaryBasket = null

    const getBasket = () => currentBasket
    const setBasket = (basket) => {
        currentBasket = basket
    }

    const propsWithGetBasket = {...props, getBasket, setBasket}

    const errorHandler = (error, component) => onErrorHandler(error, component, propsWithGetBasket)

    const getActiveBasket = () => (isPdp ? temporaryBasket : currentBasket)

    const buildTransactionInfo = (basket) => ({
        totalPriceStatus: 'FINAL',
        totalPrice: `${basket?.orderTotal ?? 0}`,
        totalPriceLabel: merchantDisplayName || 'Total',
        currencyCode: basket?.currency || ''
    })

    const buttonConfig = {
        showPayButton: true,
        isExpress: true,
        amount: {
            value: getCurrencyValueForApi(currentBasket?.orderTotal, currentBasket?.currency),
            currency: currentBasket?.currency
        },
        callbackIntents: ['SHIPPING_ADDRESS', 'SHIPPING_OPTION'],
        shippingAddressRequired: true,
        shippingAddressParameters: {
            allowedCountryCodes: [],
            phoneNumberRequired: true
        },
        shippingOptionRequired: true,
        emailRequired: true,
        billingAddressRequired: true,
        billingAddressParameters: {
            format: 'FULL'
        },
        paymentDataCallbacks: {
            onPaymentDataChanged: async (intermediatePaymentData) => {
                const {callbackTrigger, shippingAddress, shippingOptionData} =
                    intermediatePaymentData
                const paymentDataRequestUpdate = {}
                const activeBasket = getActiveBasket()

                try {
                    if (
                        callbackTrigger === 'INITIALIZE' ||
                        callbackTrigger === 'SHIPPING_ADDRESS'
                    ) {
                        if (!shippingAddress) {
                            paymentDataRequestUpdate.error = {
                                reason: 'SHIPPING_ADDRESS_UNSERVICEABLE',
                                message: 'Cannot ship to the selected address',
                                intent: 'SHIPPING_ADDRESS'
                            }
                            return paymentDataRequestUpdate
                        }

                        const {token, site} = props
                        const adyenShippingAddressService = new AdyenShippingAddressService(
                            token,
                            activeBasket?.customerInfo?.customerId,
                            activeBasket?.basketId,
                            site
                        )
                        await adyenShippingAddressService.updateShippingAddress({
                            deliveryAddress: getGooglePayDeliveryAddress(shippingAddress),
                            profile: {
                                email: '',
                                firstName: '',
                                lastName: '',
                                phone: shippingAddress.phoneNumber || ''
                            }
                        })

                        const {defaultShippingMethodId, applicableShippingMethods} =
                            await props.fetchShippingMethods(activeBasket?.basketId)

                        if (!applicableShippingMethods?.length) {
                            paymentDataRequestUpdate.error = {
                                reason: 'SHIPPING_ADDRESS_UNSERVICEABLE',
                                message: 'No shipping methods available for the selected address',
                                intent: 'SHIPPING_ADDRESS'
                            }
                            return paymentDataRequestUpdate
                        }

                        const defaultMethod =
                            applicableShippingMethods.find(
                                (m) => m.id === defaultShippingMethodId
                            ) || applicableShippingMethods[0]

                        const adyenShippingMethodsService = new AdyenShippingMethodsService(
                            token,
                            activeBasket?.customerInfo?.customerId,
                            activeBasket?.basketId,
                            site
                        )
                        const updatedBasket =
                            await adyenShippingMethodsService.updateShippingMethod(defaultMethod.id)

                        const sortedMethods = [...applicableShippingMethods].sort((a, b) => {
                            if (a.id === defaultShippingMethodId) return -1
                            if (b.id === defaultShippingMethodId) return 1
                            return 0
                        })

                        paymentDataRequestUpdate.newShippingOptionParameters = {
                            defaultSelectedOptionId: defaultMethod.id,
                            shippingOptions: sortedMethods.map((sm) => ({
                                id: sm.id,
                                label: sm.name,
                                description: sm.description || ''
                            }))
                        }
                        paymentDataRequestUpdate.newTransactionInfo =
                            buildTransactionInfo(updatedBasket)
                    } else if (callbackTrigger === 'SHIPPING_OPTION') {
                        if (!shippingOptionData?.id) {
                            paymentDataRequestUpdate.error = {
                                reason: 'SHIPPING_OPTION_INVALID',
                                message: 'Selected shipping option is not available',
                                intent: 'SHIPPING_OPTION'
                            }
                            return paymentDataRequestUpdate
                        }

                        const {token, site} = props
                        const adyenShippingMethodsService = new AdyenShippingMethodsService(
                            token,
                            activeBasket?.customerInfo?.customerId,
                            activeBasket?.basketId,
                            site
                        )
                        const updatedBasket =
                            await adyenShippingMethodsService.updateShippingMethod(
                                shippingOptionData.id
                            )

                        paymentDataRequestUpdate.newTransactionInfo =
                            buildTransactionInfo(updatedBasket)
                    }
                } catch (err) {
                    paymentDataRequestUpdate.error = {
                        reason: 'SHIPPING_ADDRESS_UNSERVICEABLE',
                        message: 'An error occurred while processing the shipping information',
                        intent: 'SHIPPING_ADDRESS'
                    }
                    onError.forEach((cb) => cb(err))
                }

                return paymentDataRequestUpdate
            }
        },
        onAuthorized: (paymentData, actions) => {
            try {
                shopperData = paymentData
                actions.resolve()
            } catch (err) {
                onError.forEach((cb) => cb(err))
                actions.reject(err)
            }
        },
        onSubmit: async (state, component, actions) => {
            try {
                const activeBasket = getActiveBasket()
                const {token, site, locale} = props

                const adyenOrderNumberService = new AdyenOrderNumberService(
                    token,
                    activeBasket?.customerInfo?.customerId,
                    activeBasket?.basketId,
                    site
                )
                const {orderNo} = await adyenOrderNumberService.fetchOrderNumber()
                if (!orderNo) {
                    throw new Error('Failed to generate order number')
                }
                setBasket({...currentBasket, c_orderNo: orderNo})

                const adyenPaymentService = new AdyenPaymentsService(
                    token,
                    activeBasket?.customerInfo?.customerId,
                    activeBasket?.basketId,
                    site
                )
                const shopperDetails = shopperData ? getGooglePayShopperDetails(shopperData) : {}
                const paymentsResponse = await adyenPaymentService.submitPayment(
                    {
                        paymentType: isPdp ? PAYMENT_TYPES.EXPRESS_PDP : PAYMENT_TYPES.EXPRESS,
                        ...state.data,
                        ...shopperDetails,
                        origin: state.data?.origin || window.location.origin
                    },
                    locale
                )

                if (paymentsResponse?.action) {
                    component.handleAction(paymentsResponse.action)
                } else if (paymentsResponse?.isFinal && paymentsResponse?.isSuccessful) {
                    actions.resolve(paymentsResponse)
                    props.navigate(`/checkout/confirmation/${paymentsResponse?.merchantReference}`)
                } else {
                    actions.reject()
                }
            } catch (err) {
                onError.forEach((cb) => cb(err))
                actions.reject(err)
            }
        },
        onAdditionalDetails: async (state, component, actions) => {
            try {
                const activeBasket = getActiveBasket()
                const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(
                    props.token,
                    activeBasket?.customerInfo?.customerId,
                    activeBasket?.basketId,
                    props.site
                )
                const paymentsDetailsResponse =
                    await adyenPaymentsDetailsService.submitPaymentsDetails(state.data)
                if (paymentsDetailsResponse?.isSuccessful) {
                    actions.resolve(paymentsDetailsResponse)
                    props.navigate(
                        `/checkout/confirmation/${paymentsDetailsResponse?.merchantReference}`
                    )
                } else {
                    actions.resolve(paymentsDetailsResponse)
                }
            } catch (err) {
                onError.forEach((cb) => cb(err))
                actions.reject(err)
            }
        },
        onClick: async (resolve, reject) => {
            if (isPdp) {
                try {
                    const {token, customerId, site, product} = props
                    const adyenTemporaryBasketService = new AdyenTemporaryBasketService(
                        token,
                        customerId,
                        site
                    )
                    temporaryBasket = await adyenTemporaryBasketService.createTemporaryBasket(
                        product
                    )
                    if (temporaryBasket?.basketId) {
                        setBasket(temporaryBasket)
                        resolve()
                    } else {
                        reject()
                    }
                } catch (err) {
                    onError.forEach((cb) => cb(err))
                    reject(err)
                }
            } else {
                resolve()
            }
        },
        onError: executeErrorCallbacks([...onError, errorHandler], propsWithGetBasket),
        onPaymentFailed: executeErrorCallbacks([...onError, errorHandler], propsWithGetBasket),
        ...configuration
    }

    return buttonConfig
}

/**
 * Handles errors during Google Pay Express checkout.
 * Cancels the express payment and redirects to the checkout page with an error flag.
 *
 * @param {Error} error - The error that occurred
 * @param {object} component - Adyen component instance
 * @param {object} props - Component properties
 * @returns {Promise<object>} Object indicating cancellation status
 */
export const onErrorHandler = async (error, component, props) => {
    try {
        if (!error?.newBasketId) {
            const basket = props.getBasket()
            const paymentCancelExpressService = new PaymentCancelExpressService(
                props.token,
                props.customerId,
                basket?.basketId,
                props.site
            )
            await paymentCancelExpressService.paymentCancelExpress()
        }
        props.navigate(`/checkout?error=true`)
        return {cancelled: true}
    } catch (err) {
        console.error('Error during express payment cancellation:', err)
        return {cancelled: false, error: err.message}
    }
}
