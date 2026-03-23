import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'

function appleDomainAssociation(req, res, next) {
    Logger.info('AppleDomainAssociation', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        if (!adyenContext?.adyenConfig) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }
        res.setHeader('content-type', 'text/plain')
        res.send(`${adyenContext.adyenConfig.appleDomainAssociation}\n`)
        Logger.info('AppleDomainAssociation', 'success')
    } catch (err) {
        Logger.error('AppleDomainAssociation', err.stack)
        return next(err)
    }
}

export {appleDomainAssociation}
