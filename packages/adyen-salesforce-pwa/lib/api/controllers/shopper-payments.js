import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getPaymentConfiguration} from '../helpers/shopperPaymentsHelper'

async function getShopperPayments(req, res, next) {
    Logger.info('getShopperPayments', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        const {basket, authorization, siteId} = adyenContext
        const {locale: shopperLocale} = req.query
        const countryCode = shopperLocale?.slice(-2)

        if (!authorization || !basket?.currency || !siteId) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        const response = await getPaymentConfiguration(
            authorization,
            siteId,
            basket.currency,
            countryCode
        )
        Logger.info('getShopperPayments', `SCAPI response: ${JSON.stringify(response)}`)

        const adyenAccount = response?.paymentMethodSetAccounts?.find(
            (account) => account?.vendor === 'Adyen'
        )

        res.locals.response = {
            ...response,
            adyenAccount
        }
        Logger.info('getShopperPayments', 'success')
        next()
    } catch (err) {
        Logger.error('getShopperPayments', JSON.stringify(err))
        next(err)
    }
}

export default getShopperPayments
