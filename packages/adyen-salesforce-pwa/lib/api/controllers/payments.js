import {formatAddressInAdyenFormat} from '../../utils/formatAddress.mjs'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {ERROR_MESSAGE, RECURRING_PROCESSING_MODEL, SHOPPER_INTERACTIONS} from '../../utils/constants.mjs'
import {createCheckoutResponse} from '../../utils/createCheckoutResponse.mjs'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {v4 as uuidv4} from 'uuid'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {AdyenError} from '../models/AdyenError'
import {getApplicationInfo} from '../../utils/getApplicationInfo.mjs'
import {
    addPaymentInstrumentToBasket,
    addShopperDataToBasket,
    getBasket,
    removeAllPaymentInstrumentsFromBasket,
    saveToBasket
} from "../../utils/basketHelper.mjs";
import {createOrderUsingOrderNo, failOrderAndReopenBasket} from "../../utils/orderHelper.mjs";

/**
 * Validates the presence of essential parameters in the request.
 * @param {object} req - The Express request object.
 * @returns {boolean} True if all required parameters are present, false otherwise.
 */
export const validateRequestParams = (req) => {
    return !!(
        req.body?.data &&
        req.headers?.authorization &&
        req.headers?.basketid &&
        req.headers?.customerid
    )
}

const VALID_STATE_DATA_FIELDS = new Set([
    'paymentMethod',
    'billingAddress',
    'deliveryAddress',
    'riskData',
    'shopperName',
    'dateOfBirth',
    'telephoneNumber',
    'shopperEmail',
    'countryCode',
    'socialSecurityNumber',
    'browserInfo',
    'installments',
    'storePaymentMethod',
    'conversionId',
    'origin',
    'returnUrl',
    'order'
])

/**
 * Filters the state data object to include only a predefined set of valid fields.
 * @param {object} stateData - The raw state data from the client.
 * @returns {object} An object containing only the valid state data fields.
 */
export const filterStateData = (stateData) =>
    Object.entries(stateData).reduce((acc, [key, value]) => {
        if (VALID_STATE_DATA_FIELDS.has(key)) {
            acc[key] = value
        }
        return acc
    }, {})

/**
 * Extracts the shopper's first and last name from the basket's billing address.
 * @param {object} basket - The shopper's basket object.
 * @returns {{firstName: string, lastName: string}} An object containing the shopper's name.
 */
export function getShopperName(basket) {
    const {firstName, lastName} = basket.billingAddress
    return {
        firstName,
        lastName
    }
}

const OPEN_INVOICE_METHODS = new Set(['zip', 'affirm', 'clearpay'])
const OPEN_INVOICE_PREFIXES = ['afterpay', 'klarna', 'ratepay', 'facilypay']

/**
 * Checks if a given payment method type is an open invoice method.
 * @param {string} paymentMethodType - The type of the payment method (e.g., 'klarna', 'afterpay').
 * @returns {boolean} True if the payment method is an open invoice type.
 */
export function isOpenInvoiceMethod(paymentMethodType) {
    if (!paymentMethodType) {
        return false
    }
    if (OPEN_INVOICE_METHODS.has(paymentMethodType)) {
        return true
    }
    return OPEN_INVOICE_PREFIXES.some((prefix) => paymentMethodType.includes(prefix))
}

/**
 * Creates an object with additional risk data based on the items in the basket.
 * @param {object} basket - The shopper's basket object.
 * @returns {object} An object containing additional data for risk assessment.
 */
export function getAdditionalData(basket) {
    const additionalData = {}
    basket.productItems.forEach((product, index) => {
        additionalData[`riskdata.basket.item${index + 1}.itemID`] = product.itemId
        additionalData[`riskdata.basket.item${index + 1}.productTitle`] = product.productName
        additionalData[`riskdata.basket.item${index + 1}.amountPerItem`] = getCurrencyValueForApi(
            product.basePrice,
            basket.currency
        )
        additionalData[`riskdata.basket.item${index + 1}.quantity`] = product.quantity
        additionalData[`riskdata.basket.item${index + 1}.currency`] = basket.currency
    })
    return additionalData
}

/**
 * Maps a basket item (product, shipping, or promotion) to the Adyen line item format.
 * @param {object} item - The basket item.
 * @param {string} currency - The currency code.
 * @param {number} [quantity=item.quantity] - The quantity of the item.
 * @returns {object} The item formatted as an Adyen line item.
 * @private
 */
const mapToLineItem = (item, currency, quantity = item.quantity) => ({
    id: item.itemId || item.priceAdjustmentId,
    quantity,
    description: item.itemText,
    amountExcludingTax: getCurrencyValueForApi(item.basePrice, currency),
    taxAmount: getCurrencyValueForApi(item.tax, currency),
    taxPercentage: item.taxRate
})

/**
 * Transforms all items in the basket (products, shipping, promotions) into an array of Adyen line items.
 * @param {object} basket - The shopper's basket object.
 * @returns {object[]} An array of Adyen line items.
 */
export function getLineItems(basket) {
    const {currency, productItems, shippingItems, priceAdjustments} = basket

    const productLineItems = productItems?.map((item) => mapToLineItem(item, currency)) || []
    const shippingLineItems =
        shippingItems?.map((item) => mapToLineItem(item, currency, 1)) || []
    const priceAdjustmentLineItems =
        priceAdjustments?.map((item) => mapToLineItem(item, currency)) || []

    return [...productLineItems, ...shippingLineItems, ...priceAdjustmentLineItems]
}

function getNativeThreeDS(adyenConfig) {
    const nativeThreeDSValues = ['preferred', 'disabled']
    return nativeThreeDSValues.includes(adyenConfig.nativeThreeDS)
        ? adyenConfig.nativeThreeDS
        : 'preferred'
}

/**
 * Constructs the complete payment request object to be sent to the Adyen /payments endpoint.
 * @param {object} data - The payment state data from the client.
 * @param {object} adyenConfig - The Adyen configuration for the current site.
 * @param {object} req - The Express request object.
 * @returns {Promise<object>} A promise that resolves to the Adyen payment request object.
 */
export async function createPaymentRequestObject(data, adyenConfig, req) {
    Logger.info('sendPayments', 'createPaymentRequestObject')
    const basket = await getBasket(req.headers.authorization, req.headers.basketid, req.headers.customerid)
    let amountValue = getCurrencyValueForApi(basket.orderTotal, basket.currency)
    if (isPartialPayment(data)) {
        Logger.info('sendPayments', 'partial payment')
        const {balance = {}} = JSON.parse(basket.c_giftCardCheckBalance || '{}')
        amountValue = balance?.value
    }
    const paymentRequest = {
        ...filterStateData(data),
        billingAddress: data.billingAddress || formatAddressInAdyenFormat(basket.billingAddress),
        deliveryAddress:
            data.deliveryAddress ||
            formatAddressInAdyenFormat(basket.shipments[0].shippingAddress),
        reference: basket.c_orderNo,
        merchantAccount: adyenConfig.merchantAccount,
        amount: {
            value: amountValue,
            currency: basket.currency
        },
        applicationInfo: getApplicationInfo(adyenConfig.systemIntegratorName),
        authenticationData: {
            threeDSRequestData: {
                nativeThreeDS: getNativeThreeDS(adyenConfig)
            }
        },
        channel: 'Web',
        returnUrl: data.returnUrl || `${data.origin}/checkout/redirect`,
        shopperReference: basket?.customerInfo?.customerId,
        shopperEmail: basket?.customerInfo?.email,
        shopperName: getShopperName(basket),
        shopperIP: req.ip
    }

    if (isOpenInvoiceMethod(data?.paymentMethod?.type)) {
        paymentRequest.lineItems = getLineItems(basket)
        paymentRequest.countryCode = paymentRequest.billingAddress.country
    }

    // Add recurringProcessingModel in case shopper wants to save the card from checkout
    if (data.storePaymentMethod) {
        paymentRequest.recurringProcessingModel = RECURRING_PROCESSING_MODEL.CARD_ON_FILE
    }

    if (data.paymentMethod?.storedPaymentMethodId) {
        paymentRequest.recurringProcessingModel = RECURRING_PROCESSING_MODEL.CARD_ON_FILE
        paymentRequest.shopperInteraction = SHOPPER_INTERACTIONS.CONT_AUTH
    } else {
        paymentRequest.shopperInteraction = SHOPPER_INTERACTIONS.ECOMMERCE
    }

    paymentRequest.additionalData = getAdditionalData(basket)

    return paymentRequest
}

/**
 * Checks if the current payment is a partial payment using a gift card.
 * @param {object} data - The payment state data from the client.
 * @returns {boolean} True if it is a partial gift card payment.
 * @private
 */
function isPartialPayment(data) {
    return Object.hasOwn(data, 'order') && data?.paymentMethod?.type === 'giftcard';

}

/**
 * Handles errors that occur during the payment process.
 * It attempts to remove payment instruments, fail the SFCC order, and recreate the basket.
 * @param {Error} err - The error that occurred.
 * @param {object} req - The Express request object.
 * @returns {Promise<void>}
 */
async function handlePaymentError(err, req) {
    Logger.error('sendPayments', err.stack)
    try {
        const {authorization, basketid, customerid} = req.headers
        const basket = await getBasket(authorization, basketid, customerid)
        if (basket?.paymentInstruments?.length) {
            Logger.info('removeAllPaymentInstrumentsFromBasket')
            await removeAllPaymentInstrumentsFromBasket(authorization, basket)
        }
        const order = await createOrderUsingOrderNo(authorization, basketid, customerid, basket.c_orderNo)

        if (order?.orderNo) {
            Logger.info('updateOrderStatus and recreate basket')
            await failOrderAndReopenBasket(authorization, customerid, order.orderNo)
        }
    } catch (e) {
        Logger.error('sendPayments - failed to handle payment error', e.stack)
    }
}

/**
 * An Express middleware that handles the /payments request from the client.
 * It orchestrates the payment process by creating a payment request,
 * calling the Adyen API, and handling the response.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function sendPayments(req, res, next) {
    Logger.info('sendPayments', 'start')
    if (!validateRequestParams(req)) {
        return next(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
    }
    const {body: {data}, headers: {authorization, basketid, customerid}, query: {siteId}} = req

    try {
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        const checkout = AdyenCheckoutConfig.getInstance(siteId)

        const basket = await getBasket(authorization, basketid, customerid)

        Logger.info('sendPayments', 'addPaymentInstrument')
        await addPaymentInstrumentToBasket(data, authorization, basket)

        if (data.paymentType === 'express') {
            await addShopperDataToBasket(data, authorization, basketid, customerid)
        }
        const paymentRequest = await createPaymentRequestObject(data, adyenConfig, req)
        const response = await checkout.payments(paymentRequest, {
            idempotencyKey: uuidv4()
        })
        Logger.info('sendPayments', `resultCode ${response.resultCode}`)

        const checkoutResponse = {
            ...createCheckoutResponse(response, basket?.c_orderNo),
            order: response.order
        }

        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(ERROR_MESSAGE.PAYMENT_NOT_SUCCESSFUL, 400, response)
        }

        if (!checkoutResponse.isFinal && checkoutResponse.isSuccessful && response.order) {
            await saveToBasket(authorization, basket.basketId, {
                c_orderData: JSON.stringify(response.order)
            })
        }
        if (checkoutResponse.isFinal && checkoutResponse.isSuccessful) {
            await createOrderUsingOrderNo(authorization, basketid, customerid, basket.c_orderNo)
        }
        Logger.info('sendPayments', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)

        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        await handlePaymentError(err, req)
        return next(err)
    }
}

export default sendPayments
