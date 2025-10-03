import sendPayments from '../../payments'
import {RESULT_CODES} from '../../../../utils/constants.mjs'
import {AdyenError} from '../../../models/AdyenError'
import * as basketHelper from '../../../helpers/basketHelper.js'
import * as orderHelper from '../../../helpers/orderHelper.js'

let mockPayments = jest.fn()

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => ({
    getConfig: jest.fn().mockReturnValue({
        app: {
            sites: [{id: 'RefArch'}],
            commerceAPI: {parameters: {siteId: 'RefArch'}}
        }
    })
}))

jest.mock('../../checkout-config', () => ({
    getInstance: jest.fn().mockImplementation(() => ({
        payments: mockPayments
    }))
}))

jest.mock('../../../helpers/basketHelper.js', () => ({
    getBasket: jest.fn(),
    addPaymentInstrumentToBasket: jest.fn(),
    removeAllPaymentInstrumentsFromBasket: jest.fn(),
    addShopperDataToBasket: jest.fn(),
    saveToBasket: jest.fn()
}))

jest.mock('../../../helpers/orderHelper.js', () => ({
    createOrderUsingOrderNo: jest.fn(),
    failOrderAndReopenBasket: jest.fn()
}))

describe('payments controller', () => {
    let req, res, next, consoleInfoSpy, consoleErrorSpy
    const mockBasket = {
        basketId: 'testBasket',
        c_orderNo: '123',
        customerInfo: {customerId: 'testCustomer'},
        billingAddress: {firstName: 'John', lastName: 'Doe'},
        shipments: [{shippingAddress: {}}],
        currency: 'USD',
        orderTotal: 1000,
        productItems: []
    }

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'mockToken',
                customerid: 'testCustomer',
                basketid: 'testBasket'
            },
            body: {data: {paymentMethod: {type: 'scheme'}}},
            query: {siteId: 'RefArch'},
            ip: '127.0.0.1'
        }
        res = {locals: {}}
        next = jest.fn()
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {
        })
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        })

        // Reset mocks
        jest.clearAllMocks()

        // Default mock implementations
        basketHelper.getBasket.mockResolvedValue(mockBasket)
        orderHelper.createOrderUsingOrderNo.mockResolvedValue({orderNo: '123'})
    })

    it('returns checkout response if request is valid and payment is AUTHORISED', async () => {
        mockPayments.mockResolvedValue({resultCode: RESULT_CODES.AUTHORISED, merchantReference: 'ref123'})

        await sendPayments(req, res, next)

        expect(basketHelper.getBasket).toHaveBeenCalled()
        expect(basketHelper.addPaymentInstrumentToBasket).toHaveBeenCalled()
        expect(mockPayments).toHaveBeenCalled()
        expect(orderHelper.createOrderUsingOrderNo).toHaveBeenCalled()
        expect(res.locals.response).toEqual({
            isFinal: true,
            isSuccessful: true,
            merchantReference: 'ref123',
            order: undefined
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('returns error if request params are invalid', async () => {
        req.headers.basketid = null
        await sendPayments(req, res, next)
        expect(next).toHaveBeenCalledWith(new AdyenError('invalid request params', 400))
    })

    it('returns error if getBasket fails', async () => {
        basketHelper.getBasket.mockRejectedValue(new Error('Basket error'))
        await sendPayments(req, res, next)
        expect(next).toHaveBeenCalledWith(new Error('Basket error'))
    })

    it('handles payment failure and attempts to roll back SFCC order', async () => {
        mockPayments.mockResolvedValue({resultCode: RESULT_CODES.ERROR, merchantReference: 'ref123'})

        await sendPayments(req, res, next)

        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(
            new AdyenError('payment was not successful', 400, {resultCode: 'Error', merchantReference: 'ref123'})
        )
    })

    it('handles non-final payments with an action', async () => {
        const mockAction = {type: 'redirect'}
        mockPayments.mockResolvedValue({resultCode: RESULT_CODES.REDIRECT_SHOPPER, action: mockAction})

        await sendPayments(req, res, next)

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
        mockPayments.mockResolvedValue({resultCode: RESULT_CODES.PRESENT_TO_SHOPPER, order: mockOrderData})

        await sendPayments(req, res, next)

        expect(basketHelper.saveToBasket).toHaveBeenCalledWith(
            'mockToken',
            'testBasket',
            {c_orderData: JSON.stringify(mockOrderData)}
        )
        expect(res.locals.response.isFinal).toBe(false)
        expect(res.locals.response.isSuccessful).toBe(true)
        expect(next).toHaveBeenCalledWith()
    })
})
