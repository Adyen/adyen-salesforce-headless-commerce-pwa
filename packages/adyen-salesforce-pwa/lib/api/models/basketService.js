import {createShopperBasketsClient} from '../helpers/basketHelper.js'
import {ERROR_MESSAGE, PAYMENT_METHODS} from '../../utils/constants.mjs'
import {getCardType} from '../../utils/getCardType.mjs'
import {convertCurrencyValueToMajorUnits} from '../../utils/parsers.mjs'
import Logger from '../models/logger'
import {AdyenError} from './AdyenError'


/**
 * A service for managing basket state and interactions with the ShopperBaskets API.
 * It centralizes basket modifications and automatically refreshes the request context
 * to prevent stale state.
 */
export class BasketService {
    /**
     * @constructor
     * @param {object} adyenContext - The request context from `res.locals.adyen`.
     * @param {object} res - The Express response object, used to update the context.
     */
    constructor(adyenContext, res) {
        this.adyenContext = adyenContext
        this.res = res
        this.shopperBaskets = createShopperBasketsClient(adyenContext.authorization)
    }

    /**
     * Updates the basket in the shared request context.
     * @param {object} updatedBasket - The new basket object from an API response.
     * @private
     */
    _updateContext(updatedBasket) {
        this.res.locals.adyen.basket = updatedBasket
    }

    /**
     * Updates a basket with the given data.
     * @param {object} data - The data to be saved to the basket's custom attributes.
     * @returns {Promise<object>} A promise that resolves to the updated basket object.
     */
    async update(data) {
        const updatedBasket = await this.shopperBaskets.updateBasket({
            body: data,
            parameters: {basketId: this.adyenContext.basket.basketId}
        })
        this._updateContext(updatedBasket)
        return updatedBasket
    }

    /**
     * Adds a payment instrument to the current basket.
     * @param {object} amount - The amount included in the payment request. Should have value and currency
     * @param {object} paymentMethod - The payment method object. Should have type and brand.
     * @param {string} pspReference - The payment reference returned from Adyen.
     * @returns {Promise<object>} A promise that resolves to the updated basket object.
     */
    async addPaymentInstrument(amount, paymentMethod, pspReference) {
        if (!amount || !paymentMethod || !pspReference) {
            const missing = []
            if (!amount) missing.push('amount')
            if (!paymentMethod) missing.push('paymentMethod')
            if (!pspReference) missing.push('pspReference')
            const errorMessage = `${ERROR_MESSAGE.ADD_PAYMENT_INSTRUMENTS}: ${missing.join(', ')}`
            Logger.error('addPaymentInstrument', errorMessage)
            throw new AdyenError(errorMessage)
        }
        const isCardPayment = paymentMethod?.type === 'scheme'
        const paymentMethodId = isCardPayment
            ? PAYMENT_METHODS.CREDIT_CARD
            : PAYMENT_METHODS.ADYEN_COMPONENT

        const paymentInstrumentReq = {
            body: {
                amount: convertCurrencyValueToMajorUnits(amount?.value, amount?.currency),
                paymentMethodId,
                paymentCard: {
                    cardType: isCardPayment
                        ? getCardType(paymentMethod?.brand)
                        : paymentMethod?.type
                },
                c_adyenPspReference: pspReference,
                c_adyenPaymentMethodType: paymentMethod?.type,
                ...(paymentMethod?.brand && {
                    c_adyenPaymentMethodBrand: paymentMethod?.brand
                })
            },
            parameters: {
                basketId: this.adyenContext.basket.basketId
            }
        }
        const updatedBasket = await this.shopperBaskets.addPaymentInstrumentToBasket(
            paymentInstrumentReq
        )
        this._updateContext(updatedBasket)
        return updatedBasket
    }

    /**
     * Updates the basket with shopper's address and customer information for express payments.
     * @param {object} data - The data from the client.
     * @returns {Promise<object>} A promise that resolves to the updated basket object.
     */
    async addShopperData(data) {
        const {basket, customerId} = this.adyenContext
        const updateShippingAddressPromise = this.shopperBaskets.updateShippingAddressForShipment({
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
                basketId: basket.basketId,
                shipmentId: 'me'
            }
        })

        const updateBillingAddressPromise = this.shopperBaskets.updateBillingAddressForBasket({
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
                basketId: basket.basketId
            }
        })

        const updateCustomerPromise = this.shopperBaskets.updateCustomerForBasket({
            body: {customerId, email: data.profile.email},
            parameters: {basketId: basket.basketId}
        })

        const [updatedBasket] = await Promise.all([
            updateShippingAddressPromise,
            updateBillingAddressPromise,
            updateCustomerPromise
        ])
        this._updateContext(updatedBasket)
        return updatedBasket
    }

    /**
     * Removes all payment instruments from the current basket sequentially.
     * @returns {Promise<object>} A promise that resolves to the final updated basket object.
     */
    async removeAllPaymentInstruments() {
        const {basket} = this.adyenContext
        if (!basket?.paymentInstruments?.length) {
            return basket
        }

        // Sequentially remove instruments to avoid race conditions.
        // The last `remove...` call will return the final state of the basket.
        const finalBasket = await basket.paymentInstruments.reduce(async (lastPromise, p) => {
            await lastPromise // Wait for the previous removal to complete.
            return this.shopperBaskets.removePaymentInstrumentFromBasket({
                parameters: {
                    basketId: this.adyenContext.basket.basketId,
                    paymentInstrumentId: p.paymentInstrumentId
                }
            })
        }, Promise.resolve())

        this._updateContext(finalBasket)
        return finalBasket
    }

    /**
     * Updates the shipping address for the basket's default shipment.
     * @param {object} data - The data from the client, containing deliveryAddress and profile info.
     * @returns {Promise<object>} A promise that resolves to the updated basket object.
     */
    async updateShippingAddress(data) {
        const updatedBasket = await this.shopperBaskets.updateShippingAddressForShipment({
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
                basketId: this.adyenContext.basket.basketId,
                shipmentId: 'me'
            }
        })
        this._updateContext(updatedBasket)
        return updatedBasket
    }

    /**
     * Sets the shipping method for the basket's default shipment.
     * @param {string} shippingMethodId - The ID of the shipping method to set.
     * @returns {Promise<object>} A promise that resolves to the updated basket object.
     */
    async setShippingMethod(shippingMethodId) {
        const updatedBasket = await this.shopperBaskets.updateShippingMethodForShipment({
            body: {
                id: shippingMethodId
            },
            parameters: {
                basketId: this.adyenContext.basket.basketId,
                shipmentId: 'me'
            }
        })
        this._updateContext(updatedBasket)
        return updatedBasket
    }
}