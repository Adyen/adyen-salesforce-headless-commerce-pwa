import {
    createOrderUsingOrderNo,
    createShopperOrderClient,
    failOrderAndReopenBasket,
    getOrderUsingOrderNo,
    getOpenOrderForShopper,
    updatePaymentInstrumentForOrder
} from '../orderHelper.js'
import {ShopperOrders} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ERROR_MESSAGE, ORDER, PAYMENT_METHOD_TYPES} from '../../../utils/constants.mjs'
import {OrderApiClient} from '../../models/orderApi.js'
import {CustomShopperOrderApiClient} from '../../models/customShopperOrderApi.js'
import {CustomAdminOrderApiClient} from '../../models/customAdminOrderApi.js'
import {
    getBasket,
    getCurrentBasketForAuthorizedShopper,
    createShopperBasketsClient
} from '../basketHelper.js'
import {getCustomerBaskets, createShopperCustomerClient} from '../customerHelper.js'
import {BasketService} from '../../models/basketService.js'
import Logger from '../../models/logger.js'

// Mock dependencies
jest.mock('commerce-sdk-isomorphic', () => ({
    ShopperOrders: jest.fn()
}))

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => ({
    getConfig: jest.fn()
}))

jest.mock('../../models/orderApi.js')
jest.mock('../../models/customShopperOrderApi.js')
jest.mock('../../models/customAdminOrderApi.js')
jest.mock('../basketHelper.js')
jest.mock('../customerHelper.js')
jest.mock('../../models/basketService.js')
jest.mock('../../models/logger.js')

describe('orderHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('getOpenOrderForShopper', () => {
        let mockGetCustomerOrders, mockShopperCustomers

        beforeEach(() => {
            mockGetCustomerOrders = jest.fn()
            mockShopperCustomers = {
                getCustomerOrders: mockGetCustomerOrders
            }
            createShopperCustomerClient.mockReturnValue(mockShopperCustomers)
        })

        it('should return the most recent order in New status', async () => {
            const mockOrders = {
                data: [
                    {orderNo: 'order-123', status: 'new'},
                    {orderNo: 'order-456', status: 'new'}
                ]
            }
            mockGetCustomerOrders.mockResolvedValue(mockOrders)

            const result = await getOpenOrderForShopper('auth-token', 'customer-123', 'RefArch')

            expect(createShopperCustomerClient).toHaveBeenCalledWith('auth-token', 'RefArch')
            expect(mockGetCustomerOrders).toHaveBeenCalledWith({
                parameters: {
                    customerId: 'customer-123',
                    status: ORDER.ORDER_STATUS_NEW,
                    limit: 1
                }
            })
            expect(result).toEqual({orderNo: 'order-123', status: 'new'})
        })

        it('should return null when no orders found', async () => {
            mockGetCustomerOrders.mockResolvedValue({data: []})

            const result = await getOpenOrderForShopper('auth-token', 'customer-123', 'RefArch')

            expect(result).toBeNull()
        })

        it('should return null when data is undefined', async () => {
            mockGetCustomerOrders.mockResolvedValue({})

            const result = await getOpenOrderForShopper('auth-token', 'customer-123', 'RefArch')

            expect(result).toBeNull()
        })

        it('should return null when API call fails', async () => {
            const apiError = new Error('API failed')
            mockGetCustomerOrders.mockRejectedValue(apiError)

            const result = await getOpenOrderForShopper('auth-token', 'customer-123', 'RefArch')

            expect(Logger.error).toHaveBeenCalledWith('getOpenOrderForShopper', 'API failed')
            expect(result).toBeNull()
        })
    })

    describe('createShopperOrderClient', () => {
        it('should create a ShopperOrders client with the correct configuration', () => {
            const mockConfig = {
                app: {
                    commerceAPI: {
                        proxyPath: '/api',
                        parameters: {clientId: 'test-client'}
                    }
                }
            }
            getConfig.mockReturnValue(mockConfig)

            const mockAuth = 'Bearer mockToken'
            createShopperOrderClient(mockAuth, 'RefArch')

            expect(getConfig).toHaveBeenCalled()
            expect(ShopperOrders).toHaveBeenCalledWith({
                ...mockConfig.app.commerceAPI,
                parameters: {
                    ...mockConfig.app.commerceAPI.parameters,
                    siteId: 'RefArch'
                },
                headers: {authorization: mockAuth}
            })
        })
    })

    describe('failOrderAndReopenBasket', () => {
        const mockGetOrder = jest.fn()
        const mockUpdateOrderStatus = jest.fn()
        const mockAdyenContext = {
            authorization: 'auth',
            customerId: 'customer-abc',
            siteId: 'RefArch'
        }

        beforeEach(() => {
            ShopperOrders.mockImplementation(() => ({
                getOrder: mockGetOrder
            }))
            OrderApiClient.mockImplementation(() => ({
                updateOrderStatus: mockUpdateOrderStatus
            }))
            getCustomerBaskets.mockResolvedValue({baskets: []})
            getBasket.mockResolvedValue({basketId: 'new-basket-123'})
            BasketService.mockImplementation(() => ({
                update: jest.fn().mockResolvedValue({}),
                removeAllPaymentInstruments: jest.fn().mockResolvedValue({})
            }))
        })

        it('should fail the order and reopen the basket successfully', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue('/baskets/new-basket-123')
                }
            })

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(mockGetOrder).toHaveBeenCalledWith({parameters: {orderNo: 'order123'}})
            expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
                'order123',
                ORDER.ORDER_STATUS_FAILED_REOPEN
            )
            expect(result).toBe('new-basket-123')
        })

        it('should throw AdyenError if order is not found', async () => {
            mockGetOrder.mockResolvedValue({})
            await expect(failOrderAndReopenBasket(mockAdyenContext, 'order123')).rejects.toThrow(
                ERROR_MESSAGE.ORDER_NOT_FOUND
            )
        })

        it('should throw AdyenError if customer ID does not match', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'different-customer'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            await expect(failOrderAndReopenBasket(mockAdyenContext, 'order123')).rejects.toThrow(
                ERROR_MESSAGE.INVALID_ORDER
            )
        })

        it('should handle basket deletion errors gracefully', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({})
            getCustomerBaskets.mockResolvedValue({
                baskets: [{basketId: 'basket-1'}, {basketId: 'basket-2'}]
            })
            const mockDeleteBasket = jest.fn().mockRejectedValue(new Error('Delete failed'))
            createShopperBasketsClient.mockReturnValue({
                deleteBasket: mockDeleteBasket
            })

            await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(Logger.error).toHaveBeenCalledWith(
                'failOrderAndReopenBasket',
                expect.stringContaining('Failed to delete existing baskets')
            )
        })

        it('should handle missing Location header', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue(null)
                }
            })
            getCurrentBasketForAuthorizedShopper.mockResolvedValue({basketId: 'current-basket-456'})

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(result).toBe('current-basket-456')
        })

        it('should handle basket cleanup errors', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue('/baskets/new-basket-123')
                }
            })
            getBasket.mockRejectedValue(new Error('Basket fetch failed'))

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(Logger.error).toHaveBeenCalledWith(
                'failOrderAndReopenBasket',
                expect.stringContaining('Failed to clean up new basket')
            )
            expect(result).toBe('new-basket-123')
        })
    })

    describe('createOrderUsingOrderNo', () => {
        const mockGetOrder = jest.fn()
        const mockCreateOrder = jest.fn()
        const mockAdyenContext = {
            authorization: 'auth',
            basket: {c_orderNo: 'order123', basketId: 'basket-abc', currency: 'USD'},
            customerId: 'customer-abc',
            siteId: 'RefArch'
        }

        beforeEach(() => {
            ShopperOrders.mockImplementation(() => ({
                getOrder: mockGetOrder
            }))
            CustomShopperOrderApiClient.mockImplementation(() => ({
                createOrder: mockCreateOrder
            }))
        })

        it('should create an order if it does not already exist', async () => {
            mockGetOrder.mockResolvedValue({}) // Order does not exist
            mockCreateOrder.mockResolvedValue({orderNo: 'order123'})

            const result = await createOrderUsingOrderNo(mockAdyenContext)

            expect(mockGetOrder).toHaveBeenCalledWith({parameters: {orderNo: 'order123'}})
            expect(mockCreateOrder).toHaveBeenCalledWith(
                'auth',
                'basket-abc',
                'customer-abc',
                'order123',
                'USD'
            )
            expect(result).toEqual({orderNo: 'order123'})
        })

        it('should return existing order without re-creating if it already exists', async () => {
            mockGetOrder.mockResolvedValue({orderNo: 'order123'}) // Order exists

            const result = await createOrderUsingOrderNo(mockAdyenContext)

            expect(result).toEqual({orderNo: 'order123'})
            expect(mockCreateOrder).not.toHaveBeenCalled()
        })

        it('should throw AdyenError when order number is missing', async () => {
            const contextWithoutOrderNo = {
                ...mockAdyenContext,
                basket: {basketId: 'basket-abc', currency: 'USD'}
            }

            await expect(createOrderUsingOrderNo(contextWithoutOrderNo)).rejects.toThrow(
                ERROR_MESSAGE.ORDER_NUMBER_NOT_FOUND
            )
        })
    })

    describe('getOrderUsingOrderNo', () => {
        const mockGetOrder = jest.fn()

        beforeEach(() => {
            CustomAdminOrderApiClient.mockImplementation(() => ({
                getOrder: mockGetOrder
            }))
        })

        it('should retrieve an order using the admin client', async () => {
            const mockOrder = {orderNo: 'admin-order-123'}
            mockGetOrder.mockResolvedValue(mockOrder)

            const result = await getOrderUsingOrderNo('admin-order-123')

            expect(CustomAdminOrderApiClient).toHaveBeenCalled()
            expect(mockGetOrder).toHaveBeenCalledWith('admin-order-123')
            expect(result).toEqual(mockOrder)
        })
    })

    describe('updatePaymentInstrumentForOrder', () => {
        let mockGetOrder, mockUpdatePaymentInstrumentForOrder

        beforeEach(() => {
            mockGetOrder = jest.fn()
            mockUpdatePaymentInstrumentForOrder = jest.fn()
            ShopperOrders.mockImplementation(() => ({
                getOrder: mockGetOrder,
                updatePaymentInstrumentForOrder: mockUpdatePaymentInstrumentForOrder
            }))
        })

        it('should update payment instrument with pspReference', async () => {
            const mockOrder = {
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'pi-123',
                        c_paymentMethodType: 'scheme',
                        c_pspReference: 'old-ref'
                    }
                ]
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdatePaymentInstrumentForOrder.mockResolvedValue({})

            await updatePaymentInstrumentForOrder(
                {authorization: 'auth-token', siteId: 'RefArch'},
                'order-123',
                'new-psp-ref'
            )

            expect(mockUpdatePaymentInstrumentForOrder).toHaveBeenCalledWith({
                parameters: {
                    orderNo: 'order-123',
                    paymentInstrumentId: 'pi-123'
                },
                body: {
                    c_paymentMethodType: 'scheme',
                    c_pspReference: 'new-psp-ref'
                }
            })
        })

        it('should skip when no non-gift-card payment instrument found', async () => {
            const mockOrder = {
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'pi-gift',
                        c_paymentMethodType: PAYMENT_METHOD_TYPES.GIFT_CARD
                    }
                ]
            }
            mockGetOrder.mockResolvedValue(mockOrder)

            await updatePaymentInstrumentForOrder(
                {authorization: 'auth-token', siteId: 'RefArch'},
                'order-123',
                'new-psp-ref'
            )

            expect(Logger.info).toHaveBeenCalledWith(
                'updatePaymentInstrumentForOrder',
                'no non-gift-card payment instrument found on order — skipping'
            )
            expect(mockUpdatePaymentInstrumentForOrder).not.toHaveBeenCalled()
        })

        it('should skip when order has no payment instruments', async () => {
            mockGetOrder.mockResolvedValue({paymentInstruments: []})

            await updatePaymentInstrumentForOrder(
                {authorization: 'auth-token', siteId: 'RefArch'},
                'order-123',
                'new-psp-ref'
            )

            expect(mockUpdatePaymentInstrumentForOrder).not.toHaveBeenCalled()
        })

        it('should handle missing pspReference gracefully', async () => {
            const mockOrder = {
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'pi-123',
                        c_paymentMethodType: 'scheme'
                    }
                ]
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdatePaymentInstrumentForOrder.mockResolvedValue({})

            await updatePaymentInstrumentForOrder(
                {authorization: 'auth-token', siteId: 'RefArch'},
                'order-123',
                null
            )

            expect(mockUpdatePaymentInstrumentForOrder).toHaveBeenCalledWith({
                parameters: {
                    orderNo: 'order-123',
                    paymentInstrumentId: 'pi-123'
                },
                body: {
                    c_paymentMethodType: 'scheme'
                }
            })
        })
    })
})
