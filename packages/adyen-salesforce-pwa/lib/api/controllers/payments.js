import {formatAddressInAdyenFormat} from '../../utils/formatAddress.mjs'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {
    APPLICATION_VERSION,
    ORDER,
    PAYMENT_METHODS,
    RECURRING_PROCESSING_MODEL,
    SHOPPER_INTERACTIONS
} from '../../utils/constants.mjs'
import {createCheckoutResponse} from '../../utils/createCheckoutResponse.mjs'
import {ShopperBaskets, ShopperOrders} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {v4 as uuidv4} from 'uuid'
import {OrderApiClient} from './orderApi'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {AdyenError} from '../models/AdyenError'

const errorMessages = {
    AMOUNT_NOT_CORRECT: 'amount not correct',
    INVALID_ORDER: 'order is invalid',
    INVALID_PARAMS: 'invalid request params',
    INVALID_BASKET: 'invalid basket',
    PAYMENT_NOT_SUCCESSFUL: 'payment not successful',
    INVALID_BILLING_ADDRESS: 'invalid billing address',
    INVALID_SHIPPING_ADDRESS: 'invalid shipping address'
}

const validateRequestParams = (req) => {
    return !(
        !req.body.data ||
        !req.headers.authorization ||
        !req.headers.basketid ||
        !req.headers.customerid
    )
}

const filterStateData = (stateData) => {
    const validFields = [
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
        'origin'
    ]
    const filteredStateData = {}
    const stateDataKeys = Object.keys(stateData)
    for (let i = 0; i < stateDataKeys.length; i++) {
        const keyName = stateDataKeys[i]
        const isFieldValid = validFields.includes(keyName)
        if (isFieldValid) {
            filteredStateData[keyName] = stateData[keyName]
        }
    }
    return filteredStateData
}

function getShopperName(order) {
    const [firstName, lastName] = order.customerName.split(' ')
    return {
        firstName,
        lastName
    }
}

function getApplicationInfo(systemIntegratorName) {
    return {
        merchantApplication: {
            name: 'adyen-salesforce-commerce-cloud',
            version: APPLICATION_VERSION
        },
        externalPlatform: {
            name: 'SalesforceCommerceCloud',
            version: 'PWA',
            integrator: systemIntegratorName
        }
    }
}

function isOpenInvoiceMethod(paymentMethod) {
    return (
        paymentMethod.indexOf('afterpay') > -1 ||
        paymentMethod.indexOf('klarna') > -1 ||
        paymentMethod.indexOf('ratepay') > -1 ||
        paymentMethod.indexOf('facilypay') > -1 ||
        paymentMethod === 'zip' ||
        paymentMethod === 'affirm' ||
        paymentMethod === 'clearpay'
    )
}

function getAdditionalData(order) {
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

function getLineItems(order) {
    const productLineItems = order?.productItems?.length
        ? order?.productItems?.map((productItem) => {
              return {
                  id: productItem.itemId,
                  quantity: productItem.quantity,
                  description: productItem.itemText,
                  amountExcludingTax: getCurrencyValueForApi(productItem.basePrice, order.currency),
                  taxAmount: getCurrencyValueForApi(productItem.tax, order.currency),
                  taxCategory: 'None',
                  taxPercentage: productItem.taxRate
              }
          })
        : []
    const shippingLineItems = order?.shippingItems?.length
        ? order?.shippingItems?.map((shippingItem) => {
              return {
                  id: shippingItem.itemId,
                  quantity: 1,
                  description: shippingItem.itemText,
                  amountExcludingTax: getCurrencyValueForApi(
                      shippingItem.basePrice,
                      order.currency
                  ),
                  taxAmount: getCurrencyValueForApi(shippingItem.tax, order.currency),
                  taxCategory: 'None',
                  taxPercentage: shippingItem.taxRate
              }
          })
        : []
    const priceAdjustmentLineItems = order?.priceAdjustments?.length
        ? order.priceAdjustments.map((priceAdjustment) => {
              return {
                  id: priceAdjustment.priceAdjustmentId,
                  quantity: priceAdjustment.quantity,
                  description: priceAdjustment.itemText,
                  amountExcludingTax: getCurrencyValueForApi(
                      priceAdjustment.basePrice,
                      order.currency
                  ),
                  taxAmount: getCurrencyValueForApi(priceAdjustment.tax, order.currency),
                  taxCategory: 'None',
                  taxPercentage: priceAdjustment.taxRate
              }
          })
        : []
    return [...productLineItems, ...shippingLineItems, ...priceAdjustmentLineItems]
}

async function removeAllPaymentInstrumentsFromBasket(basket, shopperBaskets) {
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

async function handleExpressPayment(shopperBaskets, data, basketId, customerId) {
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

async function sendPayments(req, res, next) {
    Logger.info('sendPayments', 'start')
    if (!validateRequestParams(req)) {
        const err = new AdyenError(errorMessages.INVALID_PARAMS, 400)
        Logger.error('sendPayments', err.message)
        return next(err)
    }

    let order
    try {
        const {data} = req.body
        const {siteId} = req.query

        const checkout = AdyenCheckoutConfig.getInstance(siteId)
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)

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

        if (!basket) {
            throw new AdyenError(errorMessages.INVALID_BASKET, 404)
        }

        if (!basket?.paymentInstruments || !basket?.paymentInstruments?.length) {
            Logger.info('sendPayments', 'addPaymentInstrumentToBasket')
            await shopperBaskets.addPaymentInstrumentToBasket({
                body: {
                    amount: basket.orderTotal,
                    paymentMethodId: PAYMENT_METHODS.ADYEN_COMPONENT,
                    paymentCard: {
                        cardType: data?.paymentMethod?.type
                    }
                },
                parameters: {
                    basketId: req.headers.basketid
                }
            })
        }

        if (data.paymentType === 'express') {
            await handleExpressPayment(
                shopperBaskets,
                data,
                req.headers.basketid,
                req.headers.customerid
            )
        }

        const shopperOrders = new ShopperOrders({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        order = await shopperOrders.createOrder({
            body: {
                basketId: req.headers.basketid
            }
        })
        Logger.info('sendPayments', `orderCreated ${order?.orderNo}`)

        if (order?.customerInfo?.customerId !== req.headers.customerid) {
            throw new AdyenError(errorMessages.INVALID_ORDER, 404)
        }

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
            returnUrl: `${data.origin}/checkout/redirect`,
            shopperReference: order?.customerInfo?.customerId,
            shopperEmail: order?.customerInfo?.email,
            shopperName: getShopperName(order)
        }

        if (isOpenInvoiceMethod(data?.paymentMethod?.type)) {
            paymentRequest.lineItems = getLineItems(order)
            paymentRequest.countryCode = paymentRequest.billingAddress.country
        }

        if (data.storePaymentMethod || data.paymentMethod?.storedPaymentMethodId) {
            paymentRequest.recurringProcessingModel = RECURRING_PROCESSING_MODEL.CARD_ON_FILE
            paymentRequest.shopperInteraction = data.paymentMethod?.storedPaymentMethodId
                ? SHOPPER_INTERACTIONS.CONT_AUTH
                : SHOPPER_INTERACTIONS.ECOMMERCE
        }

        paymentRequest.additionalData = getAdditionalData(order)

        const response = await checkout.payments(paymentRequest, {
            idempotencyKey: uuidv4()
        })
        Logger.info('sendPayments', `resultCode ${response.resultCode}`)

        const checkoutResponse = createCheckoutResponse(response, order.orderNo)
        if (checkoutResponse.isFinal && !checkoutResponse.isSuccessful) {
            throw new AdyenError(errorMessages.PAYMENT_NOT_SUCCESSFUL, 400)
        }

        Logger.info('sendPayments', `checkoutResponse ${JSON.stringify(checkoutResponse)}`)
        res.locals.response = checkoutResponse
        next()
    } catch (err) {
        Logger.error('sendPayments', JSON.stringify(err))
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
            await removeAllPaymentInstrumentsFromBasket(basket, shopperBaskets)
        }
        if (order?.orderNo) {
            const orderApi = new OrderApiClient()
            await orderApi.updateOrderStatus(order.orderNo, ORDER.ORDER_STATUS_FAILED)
        }
        next(err)
    }
}

export default sendPayments
