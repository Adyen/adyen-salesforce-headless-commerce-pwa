import sendPaymentDetails from '../payments-details'
import {RESULT_CODES} from '../../../utils/constants.mjs'
import {AdyenError} from '../../models/AdyenError'
import * as orderHelper from '../../helpers/orderHelper.js'
import * as paymentsHelper from '../../helpers/paymentsHelper.js'
import AdyenClientProvider from '../../models/adyenClientProvider'

let mockPaymentsDetails = jest.fn()

jest.mock('../../models/logger')
jest.mock('../../models/adyenClientProvider')

jest.mock('../../helpers/paymentsHelper.js', () => ({
    ...jest.requireActual('../../helpers/paymentsHelper.js'),
    revertCheckoutState: jest.fn(),
    validateBasketPayments: jest.fn()
}))

jest.mock('../../helpers/orderHelper.js', () => ({
    createOrderUsingOrderNo: jest.fn(),
    failOrderAndReopenBasket: jest.fn()
}))

describe('payments details controller', () => {
    let req, res, next
    const mockBasket = {
        basketId: 'testBasket',
        c_orderNo: '123',
        c_amount: JSON.stringify({value: 2500, currency: 'EUR'}),
        c_paymentMethod: JSON.stringify({type: 'scheme'})
    }

    beforeEach(() => {
        req = {
            body: {data: {details: {redirectResult: '...'}}},
            query: {siteId: 'RefArch'}
        }
        res = {
            locals: {
                adyen: {
                    basket: mockBasket,
                    siteId: 'RefArch',
                    basketService: {
                        update: jest.fn(),
                        addPaymentInstrument: jest.fn()
                    }
                }
            }
        }
        next = jest.fn()

        // Reset mocks
        jest.clearAllMocks()

        // Mock AdyenClientProvider
        AdyenClientProvider.mockImplementation(() => ({
            getPaymentsApi: () => ({
                paymentsDetails: mockPaymentsDetails
            })
        }))

        orderHelper.createOrderUsingOrderNo.mockResolvedValue({orderNo: '123'})
    })

    it('returns checkout response if payments details response is AUTHORISED', async () => {
        mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.AUTHORISED, merchantReference: 'ref123'})

        await sendPaymentDetails(req, res, next)

        expect(paymentsHelper.validateBasketPayments).toHaveBeenCalled()
        expect(mockPaymentsDetails).toHaveBeenCalled()
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'ref123',
            order: undefined,
            resultCode: RESULT_CODES.AUTHORISED
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('handles payment details failure and attempts to revert the checkout state', async () => {
        mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.ERROR, merchantReference: 'ref123'})

        await sendPaymentDetails(req, res, next)

        expect(paymentsHelper.revertCheckoutState).toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(
            new AdyenError('payments details call not successful', 400, {
                resultCode: 'Error',
                merchantReference: 'ref123'
            })
        )
    })

    it('handles non-final payment details with an action', async () => {
        const mockAction = {type: 'redirect'}
        mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.REDIRECT_SHOPPER, action: mockAction})

        await sendPaymentDetails(req, res, next)

        expect(res.locals.response).toEqual({
            isFinal: false,
            isSuccessful: true,
            merchantReference: "123",
            action: mockAction,
            order: undefined,
            resultCode: RESULT_CODES.REDIRECT_SHOPPER
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('saves partial payment order data to basket', async () => {
        const mockOrderData = {orderData: '...'}
        mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.PRESENT_TO_SHOPPER, order: mockOrderData})

        await sendPaymentDetails(req, res, next)

        expect(res.locals.adyen.basketService.update).toHaveBeenCalledWith(
            {c_orderData: JSON.stringify(mockOrderData)}
        )
        expect(res.locals.response.isFinal).toBe(false)
        expect(res.locals.response.isSuccessful).toBe(true)
        expect(next).toHaveBeenCalledWith()
    })
})
