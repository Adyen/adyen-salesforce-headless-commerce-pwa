/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const {hmacValidator} = require('@adyen/api-library')

async function handleWebhook(req, res) {
    try {
        // handle webhook notification here and update order status using ORDER API from commerce SDK.
        // check eventCode structure and types here: https://docs.adyen.com/development-resources/webhooks/webhook-types/
        // return `webhookSuccess(res)` if notification is successfully handled.
        return webhookSuccess(res)
    } catch (err) {
        res.status(err.statusCode).json(err.message)
    }
    return res
}

function authentication(req, res, next) {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return next(webhookAuthError())
    }

    const auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':')
    const user = auth[0]
    const pass = auth[1]

    if (user === process.env.ADYEN_WEBHOOK_USER && pass === process.env.ADYEN_WEBHOOK_PASSWORD) {
        next()
    } else {
        return next(webhookAuthError())
    }
}

function validateHmac(req, res, next) {
    const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY
    if (!ADYEN_HMAC_KEY) return next()
    const {notificationItems} = req.body
    const {NotificationRequestItem} = notificationItems[0]
    const HmacValidator = new hmacValidator()
    if (HmacValidator.validateHMAC(NotificationRequestItem, ADYEN_HMAC_KEY)) {
        return next()
    }
    return next(webhookAuthError)
}

function webhookSuccess(res) {
    return res.status(200).json('[accepted]')
}

function webhookAuthError() {
    let err = new Error('Access Denied!')
    err.status = 401
    return err
}

module.exports = {authentication, validateHmac, handleWebhook}
