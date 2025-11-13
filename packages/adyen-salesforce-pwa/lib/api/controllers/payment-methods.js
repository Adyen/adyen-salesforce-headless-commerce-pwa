import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {BLOCKED_PAYMENT_METHODS, ERROR_MESSAGE} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {v4 as uuidv4} from 'uuid'
import {AdyenError} from '../models/AdyenError'
import {getApplicationInfo} from '../../utils/getApplicationInfo.mjs'

async function getPaymentMethods(req, res, next) {
    Logger.info('getPaymentMethods', 'start')

    try {
        const {adyen: adyenContext} = res.locals
        const {basket, adyenConfig, customerId} = adyenContext
        const checkout = new AdyenClientProvider(adyenContext).getPaymentsApi()

        const {orderTotal, productTotal, currency, customerInfo} = basket
        const {locale: shopperLocale} = req.query
        const countryCode = shopperLocale?.slice(-2)

        const paymentMethodsRequest = {
            blockedPaymentMethods: BLOCKED_PAYMENT_METHODS,
            shopperLocale,
            countryCode,
            merchantAccount: adyenConfig.merchantAccount,
            amount: {
                value: getCurrencyValueForApi(orderTotal || productTotal, currency),
                currency: currency
            }
        }

        if (customerInfo?.authType === 'registered') {
            paymentMethodsRequest.shopperReference = customerId
        }

        const response = await checkout.paymentMethods(paymentMethodsRequest, {
            idempotencyKey: uuidv4()
        })

        if (!response?.paymentMethods?.length) {
            throw new AdyenError(ERROR_MESSAGE.NO_PAYMENT_METHODS, 400)
        }

        Logger.info('getPaymentMethods', 'success')
        res.locals.response = {
            ...response,
            applicationInfo: getApplicationInfo(adyenConfig.systemIntegratorName)
        }
        next()
    } catch (err) {
        Logger.error('getPaymentMethods', JSON.stringify(err))
        next(err)
    }
}

export default getPaymentMethods
