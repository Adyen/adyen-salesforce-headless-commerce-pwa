import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'

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

        const checkout = new AdyenClientProvider(adyenContext).getDonationsApi()
        const response = await checkout.donationCampaigns({
            merchantAccount: adyenContext.adyenConfig.merchantAccount
        })

        Logger.info('donationCampaigns', `response: ${JSON.stringify(response)}`)
        res.locals.response = response
        return next()
    } catch (err) {
        Logger.error('donationCampaigns', err.message)
        return next(err)
    }
}

export default {
    donationCampaigns
}
