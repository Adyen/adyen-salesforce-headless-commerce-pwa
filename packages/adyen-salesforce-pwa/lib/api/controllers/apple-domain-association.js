import Logger from './logger'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'

function appleDomainAssociation(req, res, next) {
    try {
        const adyenConfig = getAdyenConfigForCurrentSite()
        res.setHeader('content-type', 'text/plain')
        Logger.info('AppleDomainAssociation')
        res.send(`${adyenConfig.appleDomainAssociation}\n`)
    } catch (err) {
        return next(err)
    }
}

export {appleDomainAssociation}
