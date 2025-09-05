import sendPaymentDetails from '../payments-details.js'
import {RESULT_CODES} from '../../../utils/constants.mjs'
import {AdyenError} from '../../models/AdyenError'
import * as basketHelper from '../../../utils/basketHelper.mjs'
import * as orderHelper from '../../../utils/orderHelper.mjs'

let mockPaymentsDetails = jest.fn()

jest.mock('../checkout-config', () => ({
    getInstance: jest.fn().mockImplementation(() => ({
        paymentsDetails: mockPaymentsDetails
    }))
}))

jest.mock('../../../utils/basketHelper.mjs', () => ({
    getBasket: jest.fn(),
    removeAllPaymentInstrumentsFromBasket: jest.fn(),
    saveToBasket: jest.fn()
}))

jest.mock('../../../utils/orderHelper.mjs', () => ({
    createOrderUsingOrderNo: jest.fn(),
    failOrderAndReopenBasket: jest.fn()
}))

describe('payments details controller', () => {
    let req, res, next, consoleInfoSpy, consoleErrorSpy
    const mockBasket = {
        basketId: 'testBasket',
        c_orderNo: '123'
    }

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'mockToken',
                customerid: 'testCustomer',
                basketid: 'testBasket'
            },
            body: {data: {details: {redirectResult: '...'}}},
            query: {siteId: 'RefArch'}
        }
        res = {locals: {}}
        next = jest.fn()
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {
        })
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        })

        jest.clearAllMocks()

        basketHelper.getBasket.mockResolvedValue(mockBasket)
        orderHelper.createOrderUsingOrderNo.mockResolvedValue({orderNo: '123'})
    })

    it('returns checkout response if payments details response is AUTHORISED', async () => {
        mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.AUTHORISED, merchantReference: 'ref123'})

        await sendPaymentDetails(req, res, next)

        expect(basketHelper.getBasket).toHaveBeenCalled()
        expect(mockPaymentsDetails).toHaveBeenCalled()
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'ref123',
            order: undefined
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('handles payment details failure and attempts to roll back SFCC order', async () => {
        mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.ERROR, merchantReference: 'ref123'})

        await sendPaymentDetails(req, res, next)

        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalled()
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
            order: undefined
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('saves partial payment order data to basket', async () => {
        const mockOrderData = {orderData: '...'}
        mockPaymentsDetails.mockResolvedValue({resultCode: RESULT_CODES.PRESENT_TO_SHOPPER, order: mockOrderData})

        await sendPaymentDetails(req, res, next)

        expect(basketHelper.saveToBasket).toHaveBeenCalledWith(
            'mockToken',
            'testBasket',
            {c_orderData: JSON.stringify(mockOrderData)}
        )
        expect(res.locals.response.isFinal).toBe(false)
        expect(res.locals.response.isSuccessful).toBe(true)
        expect(next).toHaveBeenCalledWith()
    })

    it('should call next with an error if getBasket fails', async () => {
        basketHelper.getBasket.mockRejectedValue(new Error('Basket error'))
        await sendPaymentDetails(req, res, next)
        expect(next).toHaveBeenCalledWith(new Error('Basket error'))
    })
})
