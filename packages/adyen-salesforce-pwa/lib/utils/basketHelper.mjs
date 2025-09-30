import {getConfig} from "@salesforce/pwa-kit-runtime/utils/ssr-config";
import {ShopperBaskets, ShopperCustomers} from "commerce-sdk-isomorphic";
import {AdyenError} from "../api/models/AdyenError.js";
import {ERROR_MESSAGE, PAYMENT_METHODS} from "./constants.mjs";
import {getCardType} from "./getCardType.mjs";
import {convertCurrencyValueToMajorUnits} from "./parsers.mjs"

/**
 * Creates and configures an instance of the ShopperBaskets API client.
 * @param {string} authorization - The shopper's authorization token.
 * @returns {ShopperBaskets} An instance of the ShopperBaskets client.
 */
export function createShopperBasketsClient(authorization) {
    const {app: appConfig} = getConfig()
    return new ShopperBaskets({
        ...appConfig.commerceAPI,
        headers: {authorization}
    })
}

/**
 * Updates a basket with the given data.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} basketId - The ID of the basket to update.
 * @param {object} data - The data to be saved to the basket's custom attributes.
 * @returns {Promise<object>} A promise that resolves to the updated basket object.
 */
export async function saveToBasket(authorization, basketId, data) {
    const shopperBaskets = createShopperBasketsClient(authorization)
    return shopperBaskets.updateBasket({
        body: data,
        parameters: {basketId}
    })
}

/**
 * Retrieves a basket by its ID and validates that it belongs to the specified customer.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} basketId - The ID of the basket to retrieve.
 * @param {string} customerId - The ID of the customer who is expected to own the basket.
 * @returns {Promise<object>} A promise that resolves to the basket object.
 * @throws {AdyenError} If the basket is not found or does not belong to the customer.
 */
export async function getBasket(authorization, basketId, customerId) {
    const shopperBaskets = createShopperBasketsClient(authorization)
    const basket = await shopperBaskets.getBasket({
        parameters: {
            basketId: basketId
        }
    })

    if (!basket) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404)
    }
    if (basket?.customerInfo?.customerId !== customerId) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404, basket)
    }

    return basket
}

/**
 * Adds a payment instrument to the specified basket.
 * @param {object} data - The payment state data from the client, including paymentMethod details.
 * @param {string} authorization - The shopper's authorization token.
 * @param {object} basket - The basket object to which the payment instrument will be added.
 * @returns {Promise<object>} A promise that resolves to the API response for adding the instrument.
 */
export async function addPaymentInstrumentToBasket(data, authorization, basket) {
    const shopperBaskets = createShopperBasketsClient(authorization)
    const isCardPayment = data?.paymentMethod?.type === 'scheme'
    const paymentMethodId = isCardPayment
        ? PAYMENT_METHODS.CREDIT_CARD
        : PAYMENT_METHODS.ADYEN_COMPONENT
    const paymentInstrumentReq = {
        body: {
            amount: convertCurrencyValueToMajorUnits(data.amount.value, data.amount.currency),
            paymentMethodId,
            paymentCard: {
                cardType: isCardPayment
                    ? getCardType(data?.paymentMethod?.brand)
                    : data?.paymentMethod?.type
            },
            c_adyenPaymentMethodType: data?.paymentMethod?.type,
            ...data?.paymentMethod?.brand && {c_adyenPaymentMethodBrand: data?.paymentMethod?.brand}
        },
        parameters: {
            basketId: basket.basketId
        }
    }
    return shopperBaskets.addPaymentInstrumentToBasket(paymentInstrumentReq)
}

/**
 * Updates the basket with shopper's shipping address, billing address, and customer information.
 * Used for express payment flows.
 * @param {object} data - The data from the client, containing deliveryAddress, billingAddress, and profile info.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} basketId - The ID of the basket to update.
 * @param {string} customerId - The ID of the customer.
 * @returns {Promise<[object, object, object]>} A promise that resolves when all updates are complete.
 */
export async function addShopperDataToBasket(data, authorization, basketId, customerId) {
    const shopperBaskets = createShopperBasketsClient(authorization)
    const updateShippingAddressPromise = shopperBaskets.updateShippingAddressForShipment({
        body: {
            address1: data.deliveryAddress.street,
            city: data.deliveryAddress.city,
            countryCode: data.deliveryAddress.country,
            postalCode: data.deliveryAddress.postalCode,
            stateCode: data.deliveryAddress.stateOrProvince,
            firstName: data.profile.firstName,
            fullName: `${data.profile.firstName} ${data.profile.lastName}`,
            lastName: data.profile.lastName,
            phone: data.profile.phone
        },
        parameters: {
            basketId,
            shipmentId: 'me'
        }
    })

    const updateBillingAddressPromise = shopperBaskets.updateBillingAddressForBasket({
        body: {
            address1: data.billingAddress.street,
            city: data.billingAddress.city,
            countryCode: data.billingAddress.country,
            postalCode: data.billingAddress.postalCode,
            stateCode: data.billingAddress.stateOrProvince,
            firstName: data.profile.firstName,
            fullName: `${data.profile.firstName} ${data.profile.lastName}`,
            lastName: data.profile.lastName,
            phone: data.profile.phone
        },
        parameters: {
            basketId
        }
    })

    const updateCustomerPromise = shopperBaskets.updateCustomerForBasket({
        body: {
            customerId,
            email: data.profile.email
        },
        parameters: {
            basketId
        }
    })

    return Promise.all([
        updateShippingAddressPromise,
        updateBillingAddressPromise,
        updateCustomerPromise
    ])
}

/**
 * Removes all payment instruments from a given basket.
 * @param {string} authorization - The shopper's authorization token.
 * @param {object} basket - The basket object from which to remove payment instruments.
 * @returns {Promise<void|object[]>} A promise that resolves when all instruments are removed.
 */
export async function removeAllPaymentInstrumentsFromBasket(authorization, basket) {
    if (basket?.paymentInstruments?.length) {
        const shopperBaskets = createShopperBasketsClient(authorization)
        const promises = basket.paymentInstruments.map((paymentInstrument) =>
            shopperBaskets.removePaymentInstrumentFromBasket({
                parameters: {
                    basketId: basket.basketId,
                    paymentInstrumentId: paymentInstrument.paymentInstrumentId
                }
            })
        )
        return Promise.all(promises)
    }
}

/**
 * Retrieves the current basket for an authorized shopper.
 * @param {string} authorization - The shopper's authorization token.
 * @param {string} customerId - The shopper's customer ID.
 * @returns {Promise<object>} A promise that resolves to the shopper's current basket.
 * @throws {AdyenError} If the customer is not authorized or has no basket.
 */
export async function getCurrentBasketForAuthorizedShopper(authorization, customerId) {
    const {app: appConfig} = getConfig()
    const shopperCustomers = new ShopperCustomers({
        ...appConfig.commerceAPI,
        headers: {authorization: authorization}
    })

    const customer = await shopperCustomers.getCustomer({
        parameters: {
            customerId: customerId
        }
    })

    if (!customer?.customerId) {
        throw new AdyenError(ERROR_MESSAGE.UNAUTHORIZED, 401)
    }

    const {baskets} = await shopperCustomers.getCustomerBaskets({
        parameters: {
            customerId: customer?.customerId
        }
    })

    if (!baskets?.length) {
        throw new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404)
    }

    return baskets[0]
}