import {
    buildCheckoutResponse,
    patchOrderPaymentInstrument,
    handleReconciliationError
} from '../orderReconciliation.js'
import {AdyenError} from '../../models/AdyenError.js'
import * as paymentsHelper from '../paymentsHelper.js'
import * as orderHelper from '../orderHelper.js'

jest.mock('../../models/logger')

jest.mock('../paymentsHelper.js', () => ({
    createCheckoutResponse: jest.fn(),
    revertCheckoutState: jest.fn()
}))

jest.mock('../orderHelper.js', () => ({
    failOrderAndReopenBasket: jest.fn(),
    updateOrderPaymentInstrument: jest.fn()
}))

describe('orderReconciliation', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('buildCheckoutResponse', () => {
        it('returns the checkout response when successful and final', () => {
            paymentsHelper.createCheckoutResponse.mockReturnValue({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'ref123'
            })
            const response = {resultCode: 'Authorised', order: {a: 1}}

            const result = buildCheckoutResponse(response, 'order123', 'not successful')

            expect(paymentsHelper.createCheckoutResponse).toHaveBeenCalledWith(response, 'order123')
            expect(result).toEqual({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'ref123',
                order: {a: 1},
                resultCode: 'Authorised'
            })
        })

        it('returns the checkout response when non-final with an action', () => {
            paymentsHelper.createCheckoutResponse.mockReturnValue({
                isFinal: false,
                isSuccessful: true,
                action: {type: 'redirect'},
                merchantReference: 'ref123'
            })
            const response = {resultCode: 'RedirectShopper'}

            const result = buildCheckoutResponse(response, 'order123', 'not successful')

            expect(result.isFinal).toBe(false)
            expect(result.isSuccessful).toBe(true)
        })

        it('throws an AdyenError when the result is final and unsuccessful', () => {
            paymentsHelper.createCheckoutResponse.mockReturnValue({
                isFinal: true,
                isSuccessful: false,
                merchantReference: 'ref123'
            })
            const response = {resultCode: 'Refused'}

            let thrown
            try {
                buildCheckoutResponse(response, 'order123', 'payment was not successful')
            } catch (err) {
                thrown = err
            }

            expect(thrown).toBeInstanceOf(AdyenError)
            expect(thrown.message).toBe('payment was not successful')
            expect(thrown.statusCode).toBe(400)
            expect(thrown.cause).toBe(response)
        })
    })

    describe('patchOrderPaymentInstrument', () => {
        it('calls updateOrderPaymentInstrument with the given properties', async () => {
            await patchOrderPaymentInstrument(
                {
                    orderNo: 'order123',
                    siteId: 'RefArch',
                    pspReference: 'psp123',
                    cardInstallments: 3,
                    donationToken: 'token123'
                },
                'sendPayments'
            )

            expect(orderHelper.updateOrderPaymentInstrument).toHaveBeenCalledWith(
                'order123',
                'RefArch',
                'psp123',
                {
                    pspReference: 'psp123',
                    cardInstallments: 3,
                    donationToken: 'token123'
                }
            )
        })

        it('omits cardInstallments when not provided', async () => {
            await patchOrderPaymentInstrument(
                {
                    orderNo: 'order123',
                    siteId: 'RefArch',
                    pspReference: 'psp123',
                    donationToken: undefined
                },
                'sendPaymentDetails'
            )

            expect(orderHelper.updateOrderPaymentInstrument).toHaveBeenCalledWith(
                'order123',
                'RefArch',
                'psp123',
                {
                    pspReference: 'psp123',
                    cardInstallments: undefined,
                    donationToken: undefined
                }
            )
        })

        it('swallows and logs errors from updateOrderPaymentInstrument', async () => {
            orderHelper.updateOrderPaymentInstrument.mockRejectedValue(new Error('boom'))

            await expect(
                patchOrderPaymentInstrument(
                    {orderNo: 'order123', siteId: 'RefArch', pspReference: 'psp123'},
                    'sendPayments'
                )
            ).resolves.toBeUndefined()
        })
    })

    describe('handleReconciliationError', () => {
        it('fails the order and reopens the basket when an orderNo is present', async () => {
            orderHelper.failOrderAndReopenBasket.mockResolvedValue('newBasket456')
            const res = {locals: {adyen: {basket: {basketId: 'b1'}}}}

            const result = await handleReconciliationError(res, 'order123', {
                stepName: 'sendPayments'
            })

            expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalledWith(
                res.locals.adyen,
                'order123'
            )
            expect(paymentsHelper.revertCheckoutState).not.toHaveBeenCalled()
            expect(result).toBe('newBasket456')
        })

        it('reverts checkout state when no orderNo and requireBasket is false', async () => {
            const res = {locals: {adyen: {basket: undefined}}}

            const result = await handleReconciliationError(res, null, {
                stepName: 'sendPayments'
            })

            expect(paymentsHelper.revertCheckoutState).toHaveBeenCalledWith(
                res.locals.adyen,
                'sendPayments'
            )
            expect(result).toBeNull()
        })

        it('skips revert when no orderNo, requireBasket is true, and no basket is present', async () => {
            const res = {locals: {adyen: {basket: undefined}}}

            const result = await handleReconciliationError(res, null, {
                stepName: 'sendPaymentDetails',
                requireBasket: true
            })

            expect(paymentsHelper.revertCheckoutState).not.toHaveBeenCalled()
            expect(result).toBeNull()
        })

        it('reverts checkout state when no orderNo, requireBasket is true, and a basket is present', async () => {
            const res = {locals: {adyen: {basket: {basketId: 'b1'}}}}

            const result = await handleReconciliationError(res, null, {
                stepName: 'sendPaymentDetails',
                requireBasket: true
            })

            expect(paymentsHelper.revertCheckoutState).toHaveBeenCalledWith(
                res.locals.adyen,
                'sendPaymentDetails'
            )
            expect(result).toBeNull()
        })

        it('swallows errors and returns null', async () => {
            orderHelper.failOrderAndReopenBasket.mockRejectedValue(new Error('boom'))
            const res = {locals: {adyen: {basket: {basketId: 'b1'}}}}

            const result = await handleReconciliationError(res, 'order123', {
                stepName: 'sendPayments'
            })

            expect(result).toBeNull()
        })
    })
})
