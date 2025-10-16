import Logger from '../models/logger'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'

function appleDomainAssociation(req, res, next) {
    Logger.info('AppleDomainAssociation', 'start')
    try {
        const adyenConfig = getAdyenConfigForCurrentSite()
        res.setHeader('content-type', 'text/plain')
        res.send(`${adyenConfig.appleDomainAssociation}\n`)
        Logger.info('AppleDomainAssociation', 'success')
    } catch (err) {
        Logger.error('AppleDomainAssociation', err.stack)
        return next(err)
    }
}

export {appleDomainAssociation}
