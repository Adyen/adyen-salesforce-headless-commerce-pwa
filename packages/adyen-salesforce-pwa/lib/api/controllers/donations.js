import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {getOrderUsingOrderNo} from '../helpers/orderHelper'

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
        const {orderNo} = req.query
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }
        const order = await getOrderUsingOrderNo(orderNo)
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
            orderTotal: order.total
        }

        Logger.info('donationCampaigns', `response: ${JSON.stringify(response)}`)
        res.locals.response = response
        return next()
    } catch (err) {
        Logger.error('donationCampaigns', err.message)
        return next(err)
    }
}

function getPaymentMethodType(paymentMethod) {
    console.log(paymentMethod)
    if (paymentMethod?.type === 'ideal') {
        return 'sepadirectdebit'
    }
    if (
        paymentMethod?.type === 'scheme' ||
        paymentMethod?.type.includes('apple') ||
        paymentMethod?.type.includes('google')
    ) {
        return 'scheme'
    }
    return paymentMethod?.type
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
        const order = await getOrderUsingOrderNo(data.orderNo)
        if (!order) {
            throw new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 500)
        }
        const donationsApi = new AdyenClientProvider(adyenContext).getDonationsApi()
        const donationRequest = {
            merchantAccount: adyenContext.adyenConfig.merchantAccount,
            donationCampaignId: data.donationCampaignId,
            amount: data.donationAmount,
            reference: `${adyenContext.adyenConfig.merchantAccount}-${data.orderNo}`,
            donationOriginalPspReference: order.c_pspReference,
            donationToken: order.c_donationToken
        }
        const response = await donationsApi.donations(donationRequest)
        Logger.info('donate', `response: ${JSON.stringify(response)}`)
        res.locals.response = response
        return next()
    } catch (err) {
        Logger.error('donate', err.message)
        return next(err)
    }
}

export default {
    donationCampaigns,
    donate
}
