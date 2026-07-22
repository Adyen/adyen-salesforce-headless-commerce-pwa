import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'

function appleDomainAssociation(req, res, next) {
    Logger.info('AppleDomainAssociation', 'start')
    try {
        const {siteId} = req.query || {}
        const adyenConfig = getAdyenConfigForCurrentSite(siteId)
        if (!adyenConfig?.appleDomainAssociation) {
            throw new AdyenError(ERROR_MESSAGE.APPLE_PAY_DOMAIN_ASSOCIATION_FILE_NOT_FOUND, 500)
        }
        res.setHeader('content-type', 'text/plain')
        res.send(`${adyenConfig.appleDomainAssociation}`)
        Logger.info('AppleDomainAssociation', 'success')
    } catch (err) {
        Logger.error('AppleDomainAssociation', err.stack)
        return next(err)
    }
}

export {appleDomainAssociation}
