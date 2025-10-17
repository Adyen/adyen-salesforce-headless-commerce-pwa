import {balanceCheck, cancelOrder, createOrder} from '../giftCard.js'
import AdyenClientProvider from '../../models/adyenClientProvider'
import Logger from '../../models/logger'
import {cancelAdyenOrder as cancelAdyenOrderHelper, createCheckoutResponse} from '../../helpers/paymentsHelper.js'

// Mock dependencies
jest.mock('../../models/adyenClientProvider')
jest.mock('../../models/logger')
jest.mock('../../helpers/paymentsHelper.js', () => ({
    ...jest.requireActual('../../helpers/paymentsHelper.js'),
    cancelAdyenOrder: jest.fn(),
    createCheckoutResponse: jest.fn((res) => res) // Pass through for simplicity
}))

describe('Gift Card Controller', () => {
    let req, res, next
    let mockOrdersApi

    beforeEach(() => {
        jest.clearAllMocks()

        req = {
            body: {
                data: {
                    paymentMethod: {
                        type: 'giftcard',
                        brand: 'valuelink'
                    }
                }
            }
        }

        res = {
            locals: {
                adyen: {
                    basket: {
                        orderTotal: 100,
                        currency: 'USD',
                        c_orderNo: 'ORDER-123'
                    },
                    adyenConfig: {
                        merchantAccount: 'mock_merchant'
                    },
                    basketService: {
                        update: jest.fn()
                    }
                }
            }
        }

        next = jest.fn()

        mockOrdersApi = {
            getBalanceOfGiftCard: jest.fn(),
            orders: jest.fn()
        }

        AdyenClientProvider.mockImplementation(() => ({
            getOrdersApi: () => mockOrdersApi
        }))
    })

    describe('balanceCheck', () => {
        it('should check balance and update basket on success', async () => {
            const mockBalanceResponse = {balance: {value: 5000, currency: 'USD'}}
            mockOrdersApi.getBalanceOfGiftCard.mockResolvedValue(mockBalanceResponse)

            await balanceCheck(req, res, next)

            expect(mockOrdersApi.getBalanceOfGiftCard).toHaveBeenCalled()
            expect(res.locals.adyen.basketService.update).toHaveBeenCalledWith({
                c_giftCardCheckBalance: JSON.stringify(mockBalanceResponse)
            })
            expect(res.locals.response).toEqual(mockBalanceResponse)
            expect(next).toHaveBeenCalledWith()
            expect(Logger.info).toHaveBeenCalledWith('giftCards-balanceCheck', 'success')
        })

        it('should handle errors during balance check', async () => {
            const mockError = new Error('API Error')
            mockOrdersApi.getBalanceOfGiftCard.mockRejectedValue(mockError)

            await balanceCheck(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('giftCards-balanceCheck', mockError.stack)
            expect(next).toHaveBeenCalledWith(mockError)
        })
    })

    describe('createOrder', () => {
        it('should create a partial order and update basket on success', async () => {
            const mockOrderResponse = {orderData: '...', pspReference: 'PSP123'}
            mockOrdersApi.orders.mockResolvedValue(mockOrderResponse)

            await createOrder(req, res, next)

            expect(mockOrdersApi.orders).toHaveBeenCalled()
            expect(res.locals.adyen.basketService.update).toHaveBeenCalledWith({
                c_orderData: JSON.stringify(mockOrderResponse)
            })
            expect(res.locals.response).toEqual(mockOrderResponse)
            expect(next).toHaveBeenCalledWith()
            expect(Logger.info).toHaveBeenCalledWith('giftCards-createOrder', 'success')
        })

        it('should handle errors during order creation', async () => {
            const mockError = new Error('API Error')
            mockOrdersApi.orders.mockRejectedValue(mockError)

            await createOrder(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'giftCards-createOrder',
                mockError.stack
            )
            expect(next).toHaveBeenCalledWith(mockError)
        })
    })

    describe('cancelOrder', () => {
        beforeEach(() => {
            req.body.data.order = {
                orderData: '...',
                pspReference: 'PSP123'
            }
        })

        it('should cancel a partial order and return checkout response', async () => {
            const mockCancelResponse = {resultCode: 'Received', pspReference: 'CANCEL_PSP123'}
            cancelAdyenOrderHelper.mockResolvedValue(mockCancelResponse)

            await cancelOrder(req, res, next)

            expect(cancelAdyenOrderHelper).toHaveBeenCalledWith(
                res.locals.adyen,
                req.body.data.order
            )
            expect(createCheckoutResponse).toHaveBeenCalledWith(
                mockCancelResponse,
                'ORDER-123'
            )
            expect(res.locals.response).toEqual(
                expect.objectContaining({
                    resultCode: 'Received'
                })
            )
            expect(next).toHaveBeenCalledWith()
            expect(Logger.info).toHaveBeenCalledWith('giftCards-cancelOrder', 'success')
        })

        it('should handle errors during order cancellation', async () => {
            const mockError = new Error('API Error')
            cancelAdyenOrderHelper.mockRejectedValue(mockError)

            await cancelOrder(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'giftCards-cancelOrder',
                mockError.stack
            )
            expect(next).toHaveBeenCalledWith(mockError)
        })
    })
})