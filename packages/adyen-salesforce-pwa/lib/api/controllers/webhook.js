import {hmacValidator} from '@adyen/api-library'
import NotificationRequest from '@adyen/api-library/lib/src/notification/notificationRequest'
import Logger from './logger'
import {getAdyenConfigForCurrentSite} from '../../utils/getAdyenConfigForCurrentSite.mjs'
import {AdyenError} from '../models/AdyenError'

const messages = {
    AUTH_ERROR: 'Access Denied!',
    AUTH_SUCCESS: '[accepted]',
    DEFAULT_ERROR: 'Technical error!'
}

async function handleWebhook(req, res, next) {
    try {
        // handle webhook notification here and update order status using ORDER API from commerce SDK.
        // check eventCode structure and types here: https://docs.adyen.com/development-resources/webhooks/webhook-types/
        // `return next()` if notification is successfully handled.
        // webhookSuccess middleware return correct response for the webhook.
        // throw relevant error if notification is not successfully handled.
        // errorHandler middleware return error response and logs the error.
    } catch (err) {
        return next(err)
    }
}

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization
        const adyenConfig = getAdyenConfigForCurrentSite()
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
        Logger.error('authenticate', err.message)
        return next(err)
    }
}

function validateHmac(req, res, next) {
    const adyenConfig = getAdyenConfigForCurrentSite()
    if (!adyenConfig?.webhookHmacKey) {
        return next()
    }
    const {notificationItems} = req.body
    const {NotificationRequestItem} = notificationItems[0]
    try {
        const HmacValidator = new hmacValidator()
        if (HmacValidator.validateHMAC(NotificationRequestItem, adyenConfig?.webhookHmacKey)) {
            return next()
        } else {
            throw new AdyenError(messages.AUTH_ERROR, 401)
        }
    } catch (err) {
        Logger.error('validateHmac', err.message)
        return next(err)
    }
}

function parseNotification(req, res, next) {
    try {
        const notificationRequest = new NotificationRequest(req.body)
        const notificationRequestItem = (notificationRequest.notificationItems || []).filter(
            (item) => !!item
        )
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
        return next(err)
    }
}

export {authenticate, validateHmac, handleWebhook, parseNotification}
