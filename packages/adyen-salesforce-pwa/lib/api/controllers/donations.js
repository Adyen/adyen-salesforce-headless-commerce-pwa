import {DONATIONS, ERROR_MESSAGE, PAYMENT_METHOD_TYPES} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {updateOrderPaymentInstrument} from '../helpers/orderHelper'

/**
 * Retrieves active donation campaigns from Adyen.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function donationCampaigns(req, res, next) {
    try {
        Logger.info('donationCampaigns', 'start')
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }
        const {order} = adyenContext
        if (!order) {
            throw new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 500)
        }
        const checkout = new AdyenClientProvider(adyenContext).getDonationsApi()
        const donationCampaigns = await checkout.donationCampaigns({
            merchantAccount: adyenContext.adyenConfig.merchantAccount,
            currency: order.currency
        })

        const response = {
            ...donationCampaigns,
            orderTotal: order.orderTotal
        }

        Logger.info('donationCampaigns', 'success')
        res.locals.response = response
        return next()
    } catch (err) {
        Logger.error('donationCampaigns', err.message)
        return next(err)
    }
}

/**
 * Handles a donation payment request.
 * @param {object} req - The donation request object.
 * @param {object} res - The donation response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>}
 */
async function donate(req, res, next) {
    try {
        Logger.info('donate', 'start')
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }
        const {data} = req.body
        if (!data) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }
        const {order} = adyenContext
        if (!order) {
            throw new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 500)
        }
        const donationsApi = new AdyenClientProvider(adyenContext).getDonationsApi()
        const paymentInstrument = order?.paymentInstruments?.find(
            (pi) => pi.c_paymentMethodType !== PAYMENT_METHOD_TYPES.GIFT_CARD
        )
        if (!paymentInstrument?.paymentInstrumentId) {
            Logger.info('donate', 'no non-gift-card payment instrument found on order — skipping')
            throw new AdyenError(ERROR_MESSAGE.PAYMENT_INSTRUMENT_NOT_FOUND, 500)
        }
        const donationRequest = {
            merchantAccount: adyenContext.adyenConfig.merchantAccount,
            donationCampaignId: data.donationCampaignId,
            amount: data.donationAmount,
            reference: `${adyenContext.adyenConfig.merchantAccount}-${order.orderNo}`,
            donationOriginalPspReference: paymentInstrument.c_pspReference,
            donationToken: paymentInstrument.c_donationToken
        }
        const response = await donationsApi.donations(donationRequest)
        if (response.status === DONATIONS.COMPLETED) {
            Logger.info('donate', 'success')
            await updateOrderPaymentInstrument(
                order.orderNo,
                adyenContext.siteId,
                paymentInstrument.c_pspReference,
                {
                    donationToken: null
                }
            )
            res.locals.response = response
            return next()
        }
        throw new AdyenError(ERROR_MESSAGE.DONATION_NOT_COMPLETED, 500)
    } catch (err) {
        Logger.error('donate', err.message)
        return next(err)
    }
}

export default {
    donationCampaigns,
    donate
}
