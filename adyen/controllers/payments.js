import {formatAddressInAdyenFormat} from '../utils/formatAddress.mjs'
import {getCurrencyValueForApi} from '../utils/parsers.mjs'
import {
    APPLICATION_VERSION,
    SHOPPER_INTERACTIONS,
    RECURRING_PROCESSING_MODEL,
    PAYMENT_METHODS
} from '../utils/constants.mjs'
import {createCheckoutResponse} from '../utils/createCheckoutResponse.mjs'
import {Checkout} from 'commerce-sdk'
import {ShopperOrders, ShopperBaskets} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'

const errorMessages = {
    AMOUNT_NOT_CORRECT: 'amount not correct',
    INVALID_ORDER: 'order is invalid',
    INVALID_PARAMS: 'invalid request params',
    INVALID_BASKET: 'invalid basket'
}

const validateRequestParams = (req) => {
    return !(
        !req.body.data ||
        !req.headers.authorization ||
        !req.headers.basketid ||
        !req.headers.customerid
    )
}

async function sendPayments(req, res) {
    Logger.info('sendPayments', 'start')
    if (!validateRequestParams(req)) {
        throw new Error(errorMessages.INVALID_PARAMS)
    }

    const checkout = AdyenCheckoutConfig.getInstance()
    try {
        const {app: appConfig} = getConfig()
        const {data} = req.body
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
            throw new Error(errorMessages.INVALID_BASKET)
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

        if (!basket.billingAddress) {
            await shopperBaskets.updateBillingAddressForBasket({
                body: basket.shipments[0].shippingAddress,
                parameters: {
                    basketId: req.headers.basketid
                }
            })
        }

        const shopperOrders = new ShopperOrders({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        // const credentials = `${process.env.COMMERCE_API_CLIENT_ID_PRIVATE}:${process.env.COMMERCE_API_CLIENT_SECRET}`
        // const base64data = btoa(credentials)
        // const headers = {
        //     'content-type': 'application/json',
        //     authorization: `Basic ${base64data}`
        // }

        // const ordersApi = new Checkout.Orders({
        //     parameters: {
        //         ...appConfig.commerceAPI.parameters,
        //         clientId: process.env.COMMERCE_API_CLIENT_ID_PRIVATE
        //     },
        //     headers
        // })

        const order = await shopperOrders.createOrder({
            body: {
                basketId: req.headers.basketid
            }
        })
        Logger.info('sendPayments', `orderCreated ${order.orderNo}`)

        if (order?.customerInfo?.customerId !== req.headers.customerid) {
            throw new Error(errorMessages.INVALID_ORDER)
        }

        const paymentRequest = {
            ...data,
            billingAddress: formatAddressInAdyenFormat(order.billingAddress),
            deliveryAddress: formatAddressInAdyenFormat(order.shipments[0].shippingAddress),
            reference: order.orderNo,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
            amount: {
                value: getCurrencyValueForApi(order.orderTotal, order.currency),
                currency: order.currency
            },
            applicationInfo: getApplicationInfo(),
            authenticationData: {
                threeDSRequestData: {
                    nativeThreeDS: 'preferred'
                }
            },
            channel: 'Web',
            returnUrl: `http://localhost:3000/checkout`,
            shopperReference: order?.customerInfo?.customerId,
            shopperEmail: order?.customerInfo?.email
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

        const response = await checkout.instance.payments(paymentRequest)
        Logger.info('sendPayments', `resultCode ${response.resultCode}`)

        // await ordersApi.updateOrderPaymentTransaction({
        //     body: {
        //         c_externalReferenceCode: response.pspReference
        //     },
        //     parameters: {
        //         orderNo: order.orderNo,
        //         paymentInstrumentId: order.paymentInstruments[0].paymentInstrumentId
        //     }
        // })

        res.json(createCheckoutResponse(response))
    } catch (err) {
        Logger.error('sendPayments', err.message)
        res.status(err.statusCode || 500).json(err.message)
    }
}

function getApplicationInfo() {
    return {
        merchantApplication: {
            name: 'adyen-salesforce-commerce-cloud',
            version: APPLICATION_VERSION
        },
        externalPlatform: {
            name: 'SalesforceCommerceCloud',
            version: 'PWA',
            integrator: process.env.SYSTEM_INTEGRATOR_NAME
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

export default sendPayments
