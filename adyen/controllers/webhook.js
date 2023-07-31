/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const {hmacValidator} = require('@adyen/api-library')

async function handleWebhook(req, res, next) {
    try {
        // handle webhook notification here and update order status using ORDER API from commerce SDK.
        // check eventCode structure and types here: https://docs.adyen.com/development-resources/webhooks/webhook-types/
        // return `webhookSuccess(res)` if notification is successfully handled.
        return webhookSuccess(res)
    } catch (err) {
        return next(webhookError(err.message, err.statusCode))
    }
}

function authentication(req, res, next) {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return next(webhookError())
    }

    const auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':')
    const user = auth[0]
    const pass = auth[1]

    if (user === process.env.ADYEN_WEBHOOK_USER && pass === process.env.ADYEN_WEBHOOK_PASSWORD) {
        next()
    } else {
        return next(webhookError())
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
            throw Error(`Invalid Hmac Signature`)
        }
    } catch (err) {
        return next(webhookError(err.message))
    }
}

function webhookSuccess(res) {
    return res.status(200).json('[accepted]')
}

function webhookError(message = 'Access Denied!', status = 401) {
    let err = new Error(message)
    err.statusCode = status
    return err
}

const errorHandler = (err, req, res, next) => {
    res.status(err.statusCode).json(err.message)
}

module.exports = {authentication, validateHmac, handleWebhook, errorHandler}
