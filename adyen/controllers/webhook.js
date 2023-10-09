/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const {hmacValidator} = require('@adyen/api-library')

const messages = {
    AUTH_ERROR: 'Access Denied!',
    AUTH_SUCCESS: '[accepted]',
    DEFAULT_ERROR: 'Technical error!'
}

async function handleWebhook(req, res, next) {
    try {
        // handle webhook notification here and update order status using ORDER API from commerce SDK.
        // check eventCode structure and types here: https://docs.adyen.com/development-resources/webhooks/webhook-types/
        // return `webhookSuccess(res)` if notification is successfully handled.
        return webhookSuccess(res)
    } catch (err) {
        return next(err)
    }
}

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader) {
            throw new Error(messages.AUTH_ERROR)
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

        if (
            user === process.env.ADYEN_WEBHOOK_USER &&
            pass === process.env.ADYEN_WEBHOOK_PASSWORD
        ) {
            next()
        } else {
            throw new Error(messages.AUTH_ERROR)
        }
    } catch (err) {
        return next(err)
    }
}

function validateHmac(req, res, next) {
    const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY
    if (!ADYEN_HMAC_KEY) return next()
    const {notificationItems} = req.body
    const {NotificationRequestItem} = notificationItems[0]
    try {
        const HmacValidator = new hmacValidator()
        if (HmacValidator.validateHMAC(NotificationRequestItem, ADYEN_HMAC_KEY)) {
            return next()
        } else {
            throw new Error(messages.AUTH_ERROR)
        }
    } catch (err) {
        return next(err)
    }
}

function webhookSuccess(res) {
    return res.status(200).json(messages.AUTH_SUCCESS)
}

const errorHandler = (err, req, res, next) => {
    res.status(err.statusCode || 500).json(err.message || messages.DEFAULT_ERROR)
}

export {authenticate, validateHmac, handleWebhook, errorHandler}
