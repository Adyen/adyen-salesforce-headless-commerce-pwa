import {formatAddressInAdyenFormat} from '../../utils/formatAddress.mjs'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {ORDER, PAYMENT_METHODS, RECURRING_PROCESSING_MODEL, SHOPPER_INTERACTIONS} from '../../utils/constants.mjs'
import {createCheckoutResponse} from '../../utils/createCheckoutResponse.mjs'
import {ShopperBaskets} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {v4 as uuidv4} from 'uuid'
import {OrderApiClient} from './orderApi'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {AdyenError} from '../models/AdyenError'
import {getApplicationInfo} from '../../utils/getApplicationInfo.mjs'
import {getCardType} from '../../utils/getCardType.mjs'
import {saveToBasket} from "./helper";


const errorMessages = {
    AMOUNT_NOT_CORRECT: 'amount not correct',
    INVALID_ORDER: 'order is invalid',
    INVALID_PARAMS: 'invalid request params',
    INVALID_BASKET: 'invalid basket',
    PAYMENT_NOT_SUCCESSFUL: 'payment not successful',
    INVALID_BILLING_ADDRESS: 'invalid billing address',
    INVALID_SHIPPING_ADDRESS: 'invalid shipping address'
}

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

export const filterStateData = (stateData) =>
    Object.entries(stateData).reduce((acc, [key, value]) => {
        if (VALID_STATE_DATA_FIELDS.has(key)) {
            acc[key] = value
        }
        return acc
    }, {})

export function getShopperName(order) {
    const [firstName, lastName] = order?.customerName?.split(' ')
    return {
        firstName,
        lastName
    }
}

const OPEN_INVOICE_METHODS = new Set(['zip', 'affirm', 'clearpay'])
const OPEN_INVOICE_PREFIXES = ['afterpay', 'klarna', 'ratepay', 'facilypay']

export function isOpenInvoiceMethod(paymentMethodType) {
    if (!paymentMethodType) {
        return false
    }
    if (OPEN_INVOICE_METHODS.has(paymentMethodType)) {
        return true
    }
    return OPEN_INVOICE_PREFIXES.some((prefix) => paymentMethodType.includes(prefix))
}

export function getAdditionalData(order) {
    const additionalData = {}
    order.productItems.forEach((product, index) => {
        additionalData[`riskdata.basket.item${index + 1}.itemID`] = product.itemId
        additionalData[`riskdata.basket.item${index + 1}.productTitle`] = product.productName
        additionalData[`riskdata.basket.item${index + 1}.amountPerItem`] = getCurrencyValueForApi(
            product.basePrice,
            order.currency
        )
        additionalData[`riskdata.basket.item${index + 1}.quantity`] = product.quantity
        additionalData[`riskdata.basket.item${index + 1}.currency`] = order.currency
    })
    return additionalData
}

const mapToLineItem = (item, currency, quantity = item.quantity) => ({
    id: item.itemId || item.priceAdjustmentId,
    quantity,
    description: item.itemText,
    amountExcludingTax: getCurrencyValueForApi(item.basePrice, currency),
    taxAmount: getCurrencyValueForApi(item.tax, currency),
    taxCategory: 'None',
    taxPercentage: item.taxRate
})

export function getLineItems(order) {
    const {currency, productItems, shippingItems, priceAdjustments} = order

    const productLineItems = productItems?.map((item) => mapToLineItem(item, currency)) || []
    const shippingLineItems =
        shippingItems?.map((item) => mapToLineItem(item, currency, 1)) || []
    const priceAdjustmentLineItems =
        priceAdjustments?.map((item) => mapToLineItem(item, currency)) || []

    return [...productLineItems, ...shippingLineItems, ...priceAdjustmentLineItems]
}

export function createPaymentRequestObject(order, data, adyenConfig, req) {
    Logger.info('sendPayments', 'createPaymentRequestObject')
    const paymentRequest = {
        ...filterStateData(data),
        billingAddress: data.billingAddress || formatAddressInAdyenFormat(order.billingAddress),
        deliveryAddress:
            data.deliveryAddress ||
            formatAddressInAdyenFormat(order.shipments[0].shippingAddress),
        reference: order.orderNo,
        merchantAccount: adyenConfig.merchantAccount,
        amount: {
            value: getCurrencyValueForApi(order.orderTotal, order.currency),
            currency: order.currency
        },
        applicationInfo: getApplicationInfo(adyenConfig.systemIntegratorName),
        authenticationData: {
            threeDSRequestData: {
                nativeThreeDS: 'preferred'
            }
        },
        channel: 'Web',
        returnUrl: data.returnUrl || `${data.origin}/checkout/redirect`,
        shopperReference: order?.customerInfo?.customerId,
        shopperEmail: order?.customerInfo?.email,
        shopperName: getShopperName(order),
        shopperIP: req.ip
    }

    if (isOpenInvoiceMethod(data?.paymentMethod?.type)) {
        paymentRequest.lineItems = getLineItems(order)
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

    paymentRequest.additionalData = getAdditionalData(order)

    return paymentRequest
}

export async function createPartialPaymentRequestObject(data, adyenConfig, req) {
    Logger.info('sendPayments', 'createPartialPaymentRequestObject')
    const {app: appConfig} = getConfig()
    const shopperBaskets = new ShopperBaskets({
        ...appConfig.commerceAPI,
        headers: {authorization: req.headers.authorization}
    })
    const basket = await shopperBaskets.getBasket({
        parameters: {
            basketId: req.headers.basketid
        }
    })
    const {balance = {}} = JSON.parse(basket.c_giftCardCheckBalance || '{}')
    return {
        ...filterStateData(data),
        billingAddress: data.billingAddress || formatAddressInAdyenFormat(basket.billingAddress),
        deliveryAddress:
            data.deliveryAddress ||
            formatAddressInAdyenFormat(basket.shipments[0].shippingAddress),
        reference: basket.c_orderNo,
        merchantAccount: adyenConfig.merchantAccount,
        amount: {
            value: balance?.value,
            currency: basket.currency
        },
        applicationInfo: getApplicationInfo(adyenConfig.systemIntegratorName),
        authenticationData: {
            threeDSRequestData: {
                nativeThreeDS: 'preferred'
            }
        },
        channel: 'Web',
        returnUrl: data.returnUrl || `${data.origin}/checkout/redirect`,
        shopperReference: basket?.customerInfo?.customerId,
        shopperEmail: basket?.customerInfo?.email,
        shopperIP: req.ip
    }
}

export async function removeAllPaymentInstrumentsFromBasket(basket, shopperBaskets) {
    const promises = []
    if (basket?.paymentInstruments?.length) {
        basket?.paymentInstruments.forEach((paymentInstrument) => {
            const promise = shopperBaskets.removePaymentInstrumentFromBasket({
                parameters: {
                    basketId: basket.basketId,
                    paymentInstrumentId: paymentInstrument.paymentInstrumentId
                }
            })
            promises.push(promise)
        })
    }
    return Promise.all(promises)
}

export async function addShopperDataToBasketForExpressPayment(shopperBaskets, data, basketId, customerId) {
    await shopperBaskets.updateShippingAddressForShipment({
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

    await shopperBaskets.updateBillingAddressForBasket({
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
            basketId,
            shipmentId: 'me'
        }
    })

    await shopperBaskets.updateCustomerForBasket({
        body: {
            customerId,
            email: data.profile.email
        },
        parameters: {
            basketId
        }
    })
}

function isPartialPayment(data) {
    return Object.hasOwn(data, 'order') && data?.paymentMethod?.type === 'giftcard';

}

async function addPaymentInstrument(basket, shopperBaskets, data) {
    Logger.info('sendPayments', 'addPaymentInstrument')
    const isCardPayment = data?.paymentMethod?.type === 'scheme'
    const paymentMethodId = isCardPayment
        ? PAYMENT_METHODS.CREDIT_CARD
        : PAYMENT_METHODS.ADYEN_COMPONENT
    const paymentInstrumentReq = {
        body: {
            amount: basket.orderTotal,
            paymentMethodId,
            paymentCard: {
                cardType: isCardPayment
                    ? getCardType(data?.paymentMethod?.brand)
                    : data?.paymentMethod?.type
            }
        },
        parameters: {
            basketId: basket.basketId
        }
    }
    await shopperBaskets.addPaymentInstrumentToBasket(paymentInstrumentReq)
}

async function handlePaymentError(err, req, order, initialBasket) {
    Logger.error('sendPayments', err.stack)
    try {
        const {app: appConfig} = getConfig()
        const shopperBaskets = new ShopperBaskets({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })
        const basket = await shopperBaskets.getBasket({
            parameters: {
                basketId: req.headers.basketid
            }
        })
        if (basket?.paymentInstruments?.length) {
            Logger.info('removeAllPaymentInstrumentsFromBasket')
            await removeAllPaymentInstrumentsFromBasket(basket, shopperBaskets)
        }
        if (order?.orderNo) {
            Logger.info('updateOrderStatus and recreate basket')
            const orderApi = new OrderApiClient()
            await orderApi.updateOrderStatus(order.orderNo, ORDER.ORDER_STATUS_FAILED)
            if (initialBasket) {
                await shopperBaskets.createBasket({
                    body: initialBasket
                })
            }
        }
    } catch (e) {
        Logger.error('sendPayments - failed to handle payment error', e.stack)
    }
}

async function sendPayments(req, res, next) {
    Logger.info('sendPayments', 'start')
    if (!validateRequestParams(req)) {
        return next(new AdyenError(errorMessages.INVALID_PARAMS, 400))
    }

    let order
    let initialBasket;

    try {
        const {data} = req.body
        const {siteId} = req.query

        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        const checkout = AdyenCheckoutConfig.getInstance(siteId)

        const {app: appConfig} = getConfig()
        const shopperBaskets = new ShopperBaskets({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        initialBasket = await shopperBaskets.getBasket({
            parameters: {
                basketId: req.headers.basketid
            }
        })

        if (!initialBasket) {
            throw new AdyenError(errorMessages.INVALID_BASKET, 404)
        }

        await addPaymentInstrument(initialBasket, shopperBaskets, data)

        if (data.paymentType === 'express') {
            await addShopperDataToBasketForExpressPayment(
                shopperBaskets,
                data,
                req.headers.basketid,
                req.headers.customerid
            )
        }
        let paymentRequest = {}
        if (isPartialPayment(data)) {
            if (initialBasket?.customerInfo?.customerId !== req.headers.customerid) {
                throw new AdyenError(errorMessages.INVALID_ORDER, 404, initialBasket)
            }
            paymentRequest = await createPartialPaymentRequestObject(data, adyenConfig, req)
        } else {
            // const shopperOrders = new ShopperOrders({
            //     ...appConfig.commerceAPI,
            //     headers: {authorization: req.headers.authorization}
            // })
            //
            // order = await shopperOrders.createOrder({
            //     body: {
            //         basketId: req.headers.basketid
            //     }
            // })
            order = await saveToBasket(req, initialBasket.basketId, {
                c_createOrder: true
            })

            Logger.info('sendPayments', `orderCreated ${order}`)

            if (order?.customerInfo?.customerId !== req.headers.customerid) {
                throw new AdyenError(errorMessages.INVALID_ORDER, 404, order)
            }
            paymentRequest = createPaymentRequestObject(order, data, adyenConfig, req)
        }
        const response = await checkout.payments(paymentRequest, {
            idempotencyKey: uuidv4()
        })
        Logger.info('sendPayments', `resultCode ${response.resultCode}`)

        const checkoutResponse = {
            ...createCheckoutResponse(response, order?.orderNo),
            order: response.order
        }

        if (!checkoutResponse.isFinal && checkoutResponse.isSuccessful && response.order) {
            await saveToBasket(req, initialBasket.basketId, {
                c_orderData: JSON.stringify(response.order)
            })
        }

        Logger.info('sendPayments', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)
        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(errorMessages.PAYMENT_NOT_SUCCESSFUL, 400, response)
        }
        res.locals.response = checkoutResponse
        return next()
    } catch (err) {
        await handlePaymentError(err, req, order, initialBasket)
        return next(err)
    }
}

export default sendPayments
