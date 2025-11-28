import {RECURRING_PROCESSING_MODEL, SHOPPER_INTERACTIONS} from '../../utils/constants.mjs'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {formatAddressInAdyenFormat} from '../../utils/formatAddress.mjs'
import {getApplicationInfo} from '../../utils/getApplicationInfo.mjs'
import Logger from './logger.js'
import {
    filterStateData,
    getShopperName,
    getNativeThreeDS,
    isOpenInvoiceMethod,
    getLineItems,
    getLineItemsWithoutTax,
    getAdditionalData,
    amountForPartialPayments
} from '../utils/paymentUtils.js'

/**
 * Builder class for constructing Adyen payment request objects.
 * Provides a fluent interface for building payment requests with proper validation and defaults.
 */
export class PaymentRequestBuilder {
    /**
     * Creates a new PaymentRequestBuilder instance.
     * @param {object} context - Optional context object containing builder dependencies.
     * @param {object} context.basket - Basket object to use as default for methods.
     * @param {object} context.stateData - Payment state data to use as default for methods.
     * @param {object} context.adyenConfig - Adyen configuration object.
     * @param {object} context.req - Express request object.
     */
    constructor(context = {}) {
        this.paymentRequest = {}
        this.isPartialPayment = false
        this.context = {
            basket: context.basket || null,
            stateData: context.stateData || null,
            adyenConfig: context.adyenConfig || null,
            req: context.req || null
        }
    }

    /**
     * Validates an address and returns whether it's valid.
     * Logs warnings for missing required fields but doesn't throw errors.
     * @param {object} address - The address to validate.
     * @param {string} type - The type of address ('billing' or 'delivery').
     * @returns {boolean} True if the address is valid, false otherwise.
     * @private
     */
    _validateAddress(address, type) {
        if (!address) {
            Logger.warn(`PaymentRequestBuilder: ${type} address is null or undefined`)
            return false
        }

        const requiredFields = ['street', 'city', 'postalCode', 'country']
        const missingFields = requiredFields.filter((field) => !address[field])

        if (missingFields.length > 0) {
            Logger.warn(
                `PaymentRequestBuilder: ${type} address missing required fields: ${missingFields.join(', ')}`,
                {address}
            )
            return false
        }

        return true
    }

    /**
     * Sets the base payment data from client state.
     * @param {object} data - The payment state data from the client. Uses context.stateData if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withStateData(data = null) {
        const actualData = data || this.context.stateData
        if (actualData) {
            Object.assign(this.paymentRequest, filterStateData(actualData))
        }
        return this
    }

    /**
     * Sets the billing address with validation.
     * Only adds the address if it contains all required fields.
     * @param {object} billingAddress - The billing address from data or basket.
     * @param {object} fallbackAddress - The fallback billing address. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withBillingAddress(billingAddress = null, fallbackAddress = null) {
        const actualFallback = fallbackAddress || this.context.basket?.billingAddress
        const address = billingAddress || formatAddressInAdyenFormat(actualFallback)

        if (this._validateAddress(address, 'billing')) {
            this.paymentRequest.billingAddress = address
        }

        return this
    }

    /**
     * Sets the delivery address with validation.
     * Only adds the address if it contains all required fields.
     * @param {object} deliveryAddress - The delivery address from data or basket.
     * @param {object} fallbackAddress - The fallback delivery address. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withDeliveryAddress(deliveryAddress = null, fallbackAddress = null) {
        const actualFallback =
            fallbackAddress || this.context.basket?.shipments?.[0]?.shippingAddress
        const address = deliveryAddress || formatAddressInAdyenFormat(actualFallback)

        if (this._validateAddress(address, 'delivery')) {
            this.paymentRequest.deliveryAddress = address
        }

        return this
    }

    /**
     * Sets the payment reference.
     * @param {string} reference - The order reference number. Uses context.basket.c_orderNo if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withReference(reference = null) {
        const actualReference = reference || this.context.basket?.c_orderNo
        if (actualReference) {
            this.paymentRequest.reference = actualReference
        }
        return this
    }

    /**
     * Sets the merchant account.
     * @param {string} merchantAccount - The Adyen merchant account. Uses context.adyenConfig.merchantAccount if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withMerchantAccount(merchantAccount = null) {
        const actualMerchantAccount = merchantAccount || this.context.adyenConfig?.merchantAccount
        if (actualMerchantAccount) {
            this.paymentRequest.merchantAccount = actualMerchantAccount
        }
        return this
    }

    /**
     * Sets the payment amount using the basket's order total.
     * Automatically handles partial payment amounts if order data is present.
     * @param {object} basket - The basket object. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withAmount(basket = null) {
        const actualBasket = basket || this.context.basket
        if (!actualBasket) {
            return this
        }

        const currency = actualBasket.currency
        let amountValue = getCurrencyValueForApi(actualBasket.orderTotal, currency)

        // Check if this is a partial payment
        if (this.context.stateData?.order?.orderData) {
            amountValue = amountForPartialPayments(this.context.stateData, actualBasket)
            this.isPartialPayment = true
        }

        this.paymentRequest.amount = {
            value: amountValue,
            currency
        }
        return this
    }

    /**
     * Sets the payment amount using product total (excluding tax).
     * Used for express payment methods where tax is not available during the payments call.
     * @param {object} basket - The basket object. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withProductTotalAmount(basket = null) {
        const actualBasket = basket || this.context.basket
        if (actualBasket) {
            const currency = actualBasket.currency
            const amountValue = getCurrencyValueForApi(actualBasket.productTotal, currency)

            this.paymentRequest.amount = {
                value: amountValue,
                currency
            }
        }
        return this
    }

    /**
     * Sets the application info.
     * @param {string} systemIntegratorName - The system integrator name. Uses context.adyenConfig.systemIntegratorName if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withApplicationInfo(systemIntegratorName = null) {
        const actualSystemIntegratorName =
            systemIntegratorName || this.context.adyenConfig?.systemIntegratorName
        if (actualSystemIntegratorName) {
            this.paymentRequest.applicationInfo = getApplicationInfo(actualSystemIntegratorName)
        }
        return this
    }

    /**
     * Sets the 3DS authentication data configuration.
     * @param {object} adyenConfig - The Adyen configuration object. Uses context.adyenConfig if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withThreeDSAuthenticationData(adyenConfig = null) {
        const actualAdyenConfig = adyenConfig || this.context.adyenConfig
        if (actualAdyenConfig) {
            // Merge with existing authenticationData to avoid overriding
            this.paymentRequest.authenticationData = {
                ...this.paymentRequest.authenticationData,
                threeDSRequestData: {
                    nativeThreeDS: getNativeThreeDS(actualAdyenConfig)
                }
            }
        }
        return this
    }

    /**
     * Sets the channel.
     * @param {string} channel - The channel (e.g., 'Web').
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withChannel(channel = 'Web') {
        this.paymentRequest.channel = channel
        return this
    }

    /**
     * Sets the return URL.
     * @param {string} returnUrl - The return URL from data. Uses context.stateData.returnUrl if not provided.
     * @param {string} origin - The origin for fallback URL construction. Uses context.stateData.origin if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withReturnUrl(returnUrl = null, origin = null) {
        const actualReturnUrl = returnUrl || this.context.stateData?.returnUrl
        const actualOrigin = origin || this.context.stateData?.origin
        this.paymentRequest.returnUrl = actualReturnUrl || `${actualOrigin}/checkout/redirect`
        return this
    }

    /**
     * Sets the shopper reference.
     * @param {string} shopperReference - The customer ID. Uses context.basket.customerInfo.customerId if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withShopperReference(shopperReference = null) {
        const actualShopperReference =
            shopperReference || this.context.basket?.customerInfo?.customerId
        if (actualShopperReference) {
            this.paymentRequest.shopperReference = actualShopperReference
        }
        return this
    }

    /**
     * Sets the shopper email.
     * @param {string} shopperEmail - The customer email. Uses context.basket.customerInfo.email if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withShopperEmail(shopperEmail = null) {
        const actualShopperEmail = shopperEmail || this.context.basket?.customerInfo?.email
        if (actualShopperEmail) {
            this.paymentRequest.shopperEmail = actualShopperEmail
        }
        return this
    }

    /**
     * Sets the shopper IP address.
     * @param {string} shopperIP - The shopper's IP address. Uses context.req.ip if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withShopperIP(shopperIP = null) {
        const actualShopperIP = shopperIP || this.context.req?.ip
        if (actualShopperIP) {
            this.paymentRequest.shopperIP = actualShopperIP
        }
        return this
    }

    /**
     * Sets the shopper name if available.
     * @param {object} basket - The basket object. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withShopperName(basket = null) {
        const actualBasket = basket || this.context.basket
        if (actualBasket) {
            const shopperName = getShopperName(actualBasket)
            if (shopperName) {
                this.paymentRequest.shopperName = shopperName
            }
        }
        return this
    }

    /**
     * Adds line items and country code for open invoice methods.
     * @param {string} paymentMethodType - The payment method type. Uses context.stateData if not provided.
     * @param {object} basket - The basket object. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withOpenInvoiceData(paymentMethodType = null, basket = null) {
        const actualPaymentMethodType =
            paymentMethodType || this.context.stateData?.paymentMethod?.type
        const actualBasket = basket || this.context.basket

        if (isOpenInvoiceMethod(actualPaymentMethodType) && actualBasket) {
            this.paymentRequest.lineItems = getLineItems(actualBasket)
            this.paymentRequest.countryCode = this.paymentRequest.billingAddress.country
        }
        return this
    }

    /**
     * Sets the recurring processing model for stored payment methods.
     * @param {boolean} storePaymentMethod - Whether to store the payment method. Uses context.stateData.storePaymentMethod if not provided.
     * @param {string} storedPaymentMethodId - The stored payment method ID if using one. Uses context.stateData.paymentMethod.storedPaymentMethodId if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withRecurringProcessing(storePaymentMethod = null, storedPaymentMethodId = null) {
        const actualStorePaymentMethod =
            storePaymentMethod ?? this.context.stateData?.storePaymentMethod
        const actualStoredPaymentMethodId =
            storedPaymentMethodId ?? this.context.stateData?.paymentMethod?.storedPaymentMethodId

        if (actualStorePaymentMethod) {
            this.paymentRequest.recurringProcessingModel = RECURRING_PROCESSING_MODEL.CARD_ON_FILE
        }

        if (actualStoredPaymentMethodId) {
            this.paymentRequest.recurringProcessingModel = RECURRING_PROCESSING_MODEL.CARD_ON_FILE
            this.paymentRequest.shopperInteraction = SHOPPER_INTERACTIONS.CONT_AUTH
        } else {
            this.paymentRequest.shopperInteraction = SHOPPER_INTERACTIONS.ECOMMERCE
        }
        return this
    }

    /**
     * Adds additional risk data from the basket.
     * @param {object} basket - The basket object. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withAdditionalData(basket = null) {
        const actualBasket = basket || this.context.basket
        if (actualBasket) {
            this.paymentRequest.additionalData = getAdditionalData(actualBasket)
        }
        return this
    }

    /**
     * Adds line items without tax amounts.
     * Used for express payment methods where tax cannot be calculated during the payments call.
     * @param {object} basket - The basket object. Uses context.basket if not provided.
     * @returns {PaymentRequestBuilder} The builder instance for chaining.
     */
    withLineItemsWithoutTax(basket = null) {
        const actualBasket = basket || this.context.basket
        if (actualBasket) {
            this.paymentRequest.lineItems = getLineItemsWithoutTax(actualBasket)
        }
        return this
    }

    /**
     * Returns whether this is a partial payment request.
     * @returns {boolean} True if this is a partial payment, false otherwise.
     */
    isPartialPaymentRequest() {
        return this.isPartialPayment
    }

    /**
     * Builds and returns the final payment request object.
     * Automatically cleans up the order object if it doesn't contain valid orderData.
     * @returns {object} The constructed payment request object.
     */
    build() {
        // Clean up the order object if it doesn't contain valid orderData
        if (this.paymentRequest.order && !this.paymentRequest.order.orderData) {
            delete this.paymentRequest.order
        }
        return this.paymentRequest
    }

    /**
     * Static factory method to create a builder with common defaults.
     * @param {object} stateData - The payment state data from the client.
     * @param {object} adyenContext - The request context from `res.locals.adyen`.
     * @param {object} req - The Express request object.
     * @returns {PaymentRequestBuilder} A new builder instance with defaults set.
     */
    static createDefault(stateData, adyenContext, req) {
        const {basket, adyenConfig} = adyenContext

        return new PaymentRequestBuilder({basket, stateData, adyenConfig, req})
            .withStateData()
            .withBillingAddress(stateData.billingAddress)
            .withDeliveryAddress(stateData.deliveryAddress)
            .withReference()
            .withMerchantAccount()
            .withAmount()
            .withApplicationInfo()
            .withThreeDSAuthenticationData()
            .withChannel('Web')
            .withReturnUrl()
            .withShopperReference()
            .withShopperEmail()
            .withShopperIP()
            .withShopperName()
            .withOpenInvoiceData()
            .withRecurringProcessing()
            .withAdditionalData()
    }
}
