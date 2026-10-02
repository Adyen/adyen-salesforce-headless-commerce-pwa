import {ERROR_MESSAGE, POS, PAYMENT_METHODS, OMS_NAMESPACE} from '../../utils/constants.mjs'
import {generateServiceId} from '../../utils/generateServiceId.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'
import {TerminalRequestBuilder} from '../models/TerminalRequestBuilder'
import {parsePaymentResponse} from '../helpers/terminalHelper'
import {
    createOrderUsingOrderNo,
    failOrderAndReopenBasket,
    updateOrderPaymentInstrument
} from '../helpers/orderHelper.js'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'

/**
 * Express middleware that creates a synchronous terminal payment via the Adyen Terminal Cloud API.
 *
 * Flow:
 * 1. Reads basket from adyenContext (resolved by requestContext middleware via basketId header)
 * 2. Adds a payment instrument to the basket
 * 3. Creates an SFCC order from the basket
 * 4. Builds a SaleToPOIRequest and sends it synchronously to the terminal
 * 5. On success, updates the order payment instrument with pspReference
 * 6. On failure, fails the order and reopens the basket
 *
 * Request body: {terminalId, serviceId}
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function createTerminalPayment(req, res, next) {
    let orderNo = null
    let serviceId
    let terminalId
    let terminalPaymentStarted = false

    try {
        Logger.info('createTerminalPayment', 'start')
        const {adyen: adyenContext} = res.locals

        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        const {body} = req
        terminalId = body.terminalId
        serviceId = body.serviceId
        const activeStoreIds = adyenContext.adyenConfig?.posActiveStoreIds
            ? adyenContext.adyenConfig.posActiveStoreIds.split(',').map((id) => id.trim())
            : []
        const storeId = body.storeId || (activeStoreIds.length === 1 ? activeStoreIds[0] : '')

        if (!terminalId) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        if (!serviceId) {
            serviceId = generateServiceId()
        }

        const {adyenConfig, basket} = adyenContext

        if (!basket) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 400)
        }

        const currency = basket.currency
        const amount = getCurrencyValueForApi(basket.orderTotal, currency)

        await adyenContext.basketService.removeAllPaymentInstruments()
        await adyenContext.basketService.addPaymentInstrument(
            {value: amount, currency},
            {type: PAYMENT_METHODS.ADYEN_POS}
        )

        await createOrderUsingOrderNo(adyenContext)
        orderNo = adyenContext.basket?.c_orderNo
        Logger.info('createTerminalPayment', `order created: ${orderNo}`)

        const terminalApiRequest = new TerminalRequestBuilder()
            .withMessageHeader(POS.MESSAGE_CATEGORY.PAYMENT, terminalId, POS.SALE_ID, serviceId)
            .withPaymentRequest(basket.orderTotal, currency, orderNo)
            .withSaleReferenceId(POS.REFERENCE_ID)
            .withSaleToAcquirerData(adyenConfig)
            .build()

        const terminalCloudApi = new AdyenClientProvider(adyenContext).getTerminalClient()
        terminalPaymentStarted = true
        const response = await terminalCloudApi.sync(terminalApiRequest)
        const paymentResult = parsePaymentResponse(response)
        if (paymentResult.result === 'Failure') {
            Logger.info(
                'createTerminalPayment',
                `terminal failure: ${JSON.stringify(paymentResult.error)}`
            )

            let newBasketId = null
            if (orderNo) {
                try {
                    newBasketId = await failOrderAndReopenBasket(res.locals.adyen, orderNo)
                    Logger.info(
                        'createTerminalPayment',
                        `order ${orderNo} failed, new basket: ${newBasketId}`
                    )
                } catch (orderErr) {
                    Logger.error('createTerminalPayment orderFailure', orderErr.message)
                }
            }

            res.locals.response = {
                ...paymentResult,
                orderNo,
                serviceId,
                newBasketId
            }
            return next()
        }

        if (paymentResult.pspReference) {
            try {
                await updateOrderPaymentInstrument(
                    orderNo,
                    adyenContext.siteId,
                    paymentResult.pspReference,
                    {
                        pspReference: paymentResult.pspReference,
                        adyenPaymentMethod: paymentResult.paymentMethod,
                        [`${OMS_NAMESPACE}__Adyen_Payment_Method`]: paymentResult.paymentMethod,
                        Adyen_Payment_Method_Variant: paymentResult.paymentMethodVariant,
                        [`${OMS_NAMESPACE}__Adyen_Payment_Method_Variant`]:
                            paymentResult.paymentMethodVariant,
                        terminalId,
                        storeId
                    }
                )
            } catch (piErr) {
                Logger.error(
                    'createTerminalPayment',
                    `Failed to update payment instrument on order ${orderNo}: ${piErr.message}`
                )
            }
        }

        res.locals.response = {
            ...paymentResult,
            orderNo,
            serviceId
        }
        next()
    } catch (err) {
        Logger.error('createTerminalPayment', err.message)

        if (terminalPaymentStarted && serviceId && terminalId) {
            try {
                await sendAbortRequest(res.locals.adyen, serviceId, terminalId)
            } catch (abortErr) {
                Logger.error('createTerminalPayment abort', abortErr.message)
            }
        }

        if (orderNo) {
            try {
                const newBasketId = await failOrderAndReopenBasket(res.locals.adyen, orderNo)
                if (newBasketId) {
                    err.newBasketId = newBasketId
                }
            } catch (orderErr) {
                Logger.error('createTerminalPayment orderFailure', orderErr.message)
            }
        }

        next(err)
    }
}

/**
 * Sends an abort request for an in-progress terminal payment.
 * @param {object} adyenContext - The Adyen context from res.locals.adyen.
 * @param {string} serviceId - The serviceId of the payment to abort.
 * @param {string} terminalId - The terminal POIID.
 * @returns {Promise<void>}
 */
async function sendAbortRequest(adyenContext, serviceId, terminalId) {
    const abortRequest = TerminalRequestBuilder.createAbort(
        terminalId,
        POS.SALE_ID,
        POS.ABORT_REASON.MERCHANT_ABORT,
        serviceId
    )

    const terminalCloudApi = new AdyenClientProvider(adyenContext).getTerminalClient()
    await terminalCloudApi.sync(abortRequest)
    Logger.info('sendAbortRequest', `abort sent for serviceId: ${serviceId}`)
}

export default createTerminalPayment
