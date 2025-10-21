import {hmacValidator} from '@adyen/api-library'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'

const messages = {
    AUTH_ERROR: 'Access Denied!',
    AUTH_SUCCESS: '[accepted]',
    DEFAULT_ERROR: 'Technical error!'
}

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization
        const {adyenConfig} = res.locals.adyen
        if (!authHeader) {
            throw new AdyenError(messages.AUTH_ERROR, 401)
        }
        const credentialSeparator = ':'
        const authHeaderSeparator = ' '
        const encoding = 'base64'
        const encodedCredentials = authHeader.split(authHeaderSeparator)[1]
        const auth = new Buffer.from(encodedCredentials, encoding)
            .toString()
            .split(credentialSeparator)
        const user = auth[0]
        const pass = auth[1]

        if (user === adyenConfig.webhookUser && pass === adyenConfig.webhookPassword) {
            return next()
        } else {
            throw new AdyenError(messages.AUTH_ERROR, 401)
        }
    } catch (err) {
        Logger.error('authenticate', err.stack)
        return next(err)
    }
}

function validateHmac(req, res, next) {
    try {
        const {adyenConfig} = res.locals.adyen
        if (!adyenConfig?.webhookHmacKey) {
            return next()
        }
        const {notificationItems} = req.body
        const {NotificationRequestItem} = notificationItems[0]
        const HmacValidator = new hmacValidator()
        if (HmacValidator.validateHMAC(NotificationRequestItem, adyenConfig?.webhookHmacKey)) {
            return next()
        } else {
            throw new AdyenError(messages.AUTH_ERROR, 401)
        }
    } catch (err) {
        Logger.error('validateHmac', err.stack)
        return next(err)
    }
}

function parseNotification(req, res, next) {
    try {
        const notificationItems = req.body.notificationItems || []
        const notificationRequestItem = notificationItems.filter((item) => !!item)
        if (!notificationRequestItem[0]) {
            return next(
                new AdyenError(
                    'Handling of Adyen notification has failed. No input parameters were provided.',
                    400
                )
            )
        }
        res.locals.notification = notificationRequestItem[0]
        Logger.info('AdyenNotification', JSON.stringify(res.locals.notification))
        return next()
    } catch (err) {
        Logger.error('parseNotification', err.stack)
        return next(err)
    }
}

export {authenticate, validateHmac, parseNotification}
