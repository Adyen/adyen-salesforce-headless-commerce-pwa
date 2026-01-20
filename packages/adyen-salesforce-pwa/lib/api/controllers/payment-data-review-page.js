import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {ERROR_MESSAGE} from '../../utils/constants.mjs'

/**
 * Validates the payment data structure for the review page.
 * @param {object} paymentData - The payment data to validate.
 * @returns {boolean} True if valid.
 * @throws {AdyenError} If validation fails.
 */
function validatePaymentData(paymentData) {
    if (!paymentData || typeof paymentData !== 'object') {
        throw new AdyenError(ERROR_MESSAGE.INVALID_PAYMENT_DATA, 400)
    }

    const {details, paymentData: paymentDataString} = paymentData

    if (!details || typeof details !== 'object') {
        throw new AdyenError(ERROR_MESSAGE.INVALID_PAYMENT_DATA, 400)
    }

    const requiredDetailFields = ['payerID', 'orderID', 'paymentID', 'paymentSource']
    const missingFields = requiredDetailFields.filter((field) => !details[field])

    if (missingFields.length > 0) {
        throw new AdyenError(
            `${ERROR_MESSAGE.INVALID_PAYMENT_DATA}: missing ${missingFields.join(', ')}`,
            400
        )
    }

    if (!paymentDataString || typeof paymentDataString !== 'string') {
        throw new AdyenError(ERROR_MESSAGE.INVALID_PAYMENT_DATA, 400)
    }

    return true
}

/**
 * Retrieves payment data stored on the basket for the review page.
 * @async
 * @param {object} req - Express request object.
 * @param {object} res - Express response object with adyen context in res.locals.
 * @param {function} next - Express next middleware function.
 * @returns {Promise<void>} Sets res.locals.response with parsed payment data or empty object.
 * @throws {AdyenError} If adyen context or basket is not found.
 */
async function getPaymentDataForReviewPage(req, res, next) {
    Logger.info('getPaymentDataForReviewPage', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        const {basket} = adyenContext
        if (!basket) {
            throw new AdyenError(ERROR_MESSAGE.BASKET_NOT_FOUND, 400)
        }

        const paymentData = basket.c_paymentDataForReviewPage
        res.locals.response = paymentData ? JSON.parse(paymentData) : {}
        Logger.info('getPaymentDataForReviewPage', 'success')
        next()
    } catch (err) {
        Logger.error('getPaymentDataForReviewPage', err.stack)
        next(err)
    }
}

/**
 * Stores payment data on the basket for later use on the review page.
 * @async
 * @param {object} req - Express request object with paymentData in req.body.
 * @param {object} req.body.paymentData - The payment data to store.
 * @param {object} req.body.paymentData.details - Payment details object.
 * @param {string} req.body.paymentData.details.payerID - The payer ID.
 * @param {string} req.body.paymentData.details.orderID - The order ID.
 * @param {string} req.body.paymentData.details.paymentID - The payment ID.
 * @param {string} req.body.paymentData.details.paymentSource - The payment source (e.g., 'paypal').
 * @param {string} req.body.paymentData.paymentData - The payment data string.
 * @param {object} res - Express response object with adyen context in res.locals.
 * @param {function} next - Express next middleware function.
 * @returns {Promise<void>} Sets res.locals.response with the updated basket.
 * @throws {AdyenError} If adyen context is not found or payment data validation fails.
 */
async function setPaymentDataForReviewPage(req, res, next) {
    Logger.info('setPaymentDataForReviewPage', 'start')
    try {
        const {adyen: adyenContext} = res.locals
        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        const {paymentData} = req.body
        validatePaymentData(paymentData)

        const updatedBasket = await adyenContext.basketService.update({
            c_paymentDataForReviewPage: JSON.stringify(paymentData)
        })

        Logger.info('setPaymentDataForReviewPage', 'success')
        res.locals.response = updatedBasket
        next()
    } catch (err) {
        Logger.error('setPaymentDataForReviewPage', err.stack)
        next(err)
    }
}

export default {getPaymentDataForReviewPage, setPaymentDataForReviewPage, validatePaymentData}
