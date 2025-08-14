import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from './checkout-config'
import Logger from './logger'
import {v4 as uuidv4} from 'uuid'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {AdyenError} from '../models/AdyenError'
import {filterStateData} from "./payments";

const errorMessages = {
    UNAUTHORIZED: 'unauthorized',
    INVALID_BASKET: 'invalid basket',
}

export async function balanceCheck(req, res, next) {
    Logger.info('giftCards-balanceCheck', 'start')

    try {
        const {data} = req.body
        const {siteId} = req.query

        const ordersApi = AdyenCheckoutConfig.getOrdersApiInstance(siteId)
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)

        const {app: appConfig} = getConfig()
        const shopperCustomers = new ShopperCustomers({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const customer = await shopperCustomers.getCustomer({
            parameters: {
                customerId: req.headers.customerid
            }
        })

        if (!customer?.customerId) {
            throw new AdyenError(errorMessages.UNAUTHORIZED, 401)
        }

        const {baskets} = await shopperCustomers.getCustomerBaskets({
            parameters: {
                customerId: customer?.customerId
            }
        })

        if (!baskets?.length) {
            throw new AdyenError(errorMessages.INVALID_BASKET, 404)
        }

        const [{orderTotal, productTotal, currency}] = baskets

        const request = {
            ...filterStateData(data),
            merchantAccount: adyenConfig.merchantAccount,
            amount: {
                value: getCurrencyValueForApi(orderTotal || productTotal, currency),
                currency: currency
            }
        }
        const response = await ordersApi.getBalanceOfGiftCard(request, {
            idempotencyKey: uuidv4()
        })

        Logger.info('giftCards-balanceCheck', 'success')
        res.locals.response = response
        next()
    } catch (err) {
        Logger.error('giftCards-balanceCheck', JSON.stringify(err))
        next(err)
    }
}

export async function createOrder(req, res, next) {
    Logger.info('giftCards-createOrder', 'start')

    try {
        const {data} = req.body
        const {siteId} = req.query

        const ordersApi = AdyenCheckoutConfig.getOrdersApiInstance(siteId)
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)

        const {app: appConfig} = getConfig()
        const shopperCustomers = new ShopperCustomers({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const customer = await shopperCustomers.getCustomer({
            parameters: {
                customerId: req.headers.customerid
            }
        })

        if (!customer?.customerId) {
            throw new AdyenError(errorMessages.UNAUTHORIZED, 401)
        }

        const {baskets} = await shopperCustomers.getCustomerBaskets({
            parameters: {
                customerId: customer?.customerId
            }
        })

        if (!baskets?.length) {
            throw new AdyenError(errorMessages.INVALID_BASKET, 404)
        }

        const [{orderTotal, productTotal, currency}] = baskets

        const request = {
            ...filterStateData(data),
            merchantAccount: adyenConfig.merchantAccount,
            amount: {
                value: getCurrencyValueForApi(orderTotal || productTotal, currency),
                currency: currency
            }
        }
        const response = await ordersApi.orders(request, {
            idempotencyKey: uuidv4()
        })

        Logger.info('giftCards-createOrder', 'success')
        res.locals.response = response
        next()
    } catch (err) {
        Logger.error('giftCards-createOrder', JSON.stringify(err))
        next(err)
    }
}

export async function cancelOrder(req, res, next) {
    Logger.info('giftCards-cancelOrder', 'start')

    try {
        const {data} = req.body
        const {siteId} = req.query

        const ordersApi = AdyenCheckoutConfig.getOrdersApiInstance(siteId)
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)

        const {app: appConfig} = getConfig()
        const shopperCustomers = new ShopperCustomers({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const customer = await shopperCustomers.getCustomer({
            parameters: {
                customerId: req.headers.customerid
            }
        })

        if (!customer?.customerId) {
            throw new AdyenError(errorMessages.UNAUTHORIZED, 401)
        }

        const {baskets} = await shopperCustomers.getCustomerBaskets({
            parameters: {
                customerId: customer?.customerId
            }
        })

        if (!baskets?.length) {
            throw new AdyenError(errorMessages.INVALID_BASKET, 404)
        }

        const request = {
            ...filterStateData(data),
            merchantAccount: adyenConfig.merchantAccount,
        }
        const response = await ordersApi.cancelOrder(request, {
            idempotencyKey: uuidv4()
        })

        Logger.info('giftCards-cancelOrder', 'success')
        res.locals.response = response
        next()
    } catch (err) {
        Logger.error('giftCards-cancelOrder', JSON.stringify(err))
        next(err)
    }
}

