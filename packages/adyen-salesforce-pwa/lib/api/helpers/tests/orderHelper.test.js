import {
    createOrderUsingOrderNo,
    createShopperOrderClient,
    failOrderAndReopenBasket,
    getOrderUsingOrderNo,
    getOpenOrderForShopper,
    updateOrderPaymentInstrument
} from '../orderHelper.js'
import {ShopperOrders} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ERROR_MESSAGE, ORDER} from '../../../utils/constants.mjs'
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
                    status: ORDER.ORDER_STATUS_CREATED,
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
        const mockDeleteBasket = jest.fn()
        const mockBasketUpdate = jest.fn()
        const mockRemoveAllPaymentInstruments = jest.fn()
        const mockAdyenContext = {
            authorization: 'auth',
            customerId: 'customer-abc',
            siteId: 'RefArch'
        }

        beforeEach(() => {
            getConfig.mockReturnValue({
                app: {commerceAPI: {parameters: {siteId: 'RefArch'}}}
            })
            ShopperOrders.mockImplementation(() => ({
                getOrder: mockGetOrder
            }))
            OrderApiClient.mockImplementation(() => ({
                updateOrderStatus: mockUpdateOrderStatus
            }))
            getCustomerBaskets.mockResolvedValue({baskets: []})
            getBasket.mockResolvedValue({basketId: 'new-basket-123'})
            getCurrentBasketForAuthorizedShopper.mockResolvedValue({basketId: 'current-basket-456'})
            createShopperBasketsClient.mockReturnValue({deleteBasket: mockDeleteBasket})
            mockBasketUpdate.mockResolvedValue({})
            mockRemoveAllPaymentInstruments.mockResolvedValue({})
            BasketService.mockImplementation(() => ({
                update: mockBasketUpdate,
                removeAllPaymentInstruments: mockRemoveAllPaymentInstruments
            }))
        })

        it('should fail the order and reopen the basket successfully', async () => {
            const mockOrder = {
                orderNo: 'order123',
                status: ORDER.ORDER_STATUS_CREATED,
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
            expect(getBasket).toHaveBeenCalledTimes(1)
            expect(getCurrentBasketForAuthorizedShopper).not.toHaveBeenCalled()
            expect(result).toBe('new-basket-123')
        })

        it('should fall back to the current basket when the Location basket is unavailable', async () => {
            const mockOrder = {
                orderNo: 'order123',
                status: ORDER.ORDER_STATUS_CREATED,
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue('/baskets/location-basket-123')
                }
            })
            getBasket.mockRejectedValue(
                Object.assign(new Error('Basket not found'), {statusCode: 404})
            )
            getCurrentBasketForAuthorizedShopper.mockResolvedValue({
                basketId: 'current-basket-456'
            })

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(getBasket).toHaveBeenCalledTimes(1)
            expect(getCurrentBasketForAuthorizedShopper).toHaveBeenCalledTimes(1)
            expect(getCurrentBasketForAuthorizedShopper).toHaveBeenCalledWith(
                'auth',
                'customer-abc',
                'RefArch'
            )
            expect(mockBasketUpdate).toHaveBeenCalledWith(expect.objectContaining({c_orderNo: ''}))
            expect(mockRemoveAllPaymentInstruments).toHaveBeenCalled()
            expect(result).toBe('current-basket-456')
        })

        it('should preserve the Location basket ID when no reopened basket can be resolved', async () => {
            mockGetOrder.mockResolvedValue({
                orderNo: 'order123',
                status: ORDER.ORDER_STATUS_CREATED,
                customerInfo: {customerId: 'customer-abc'}
            })
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue('/baskets/location-basket-123')
                }
            })
            getBasket.mockRejectedValue(
                Object.assign(new Error('Basket not found'), {statusCode: 404})
            )
            getCurrentBasketForAuthorizedShopper.mockRejectedValue(
                Object.assign(new Error('No current basket'), {statusCode: 404})
            )

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(getBasket).toHaveBeenCalledTimes(1)
            expect(getCurrentBasketForAuthorizedShopper).toHaveBeenCalledTimes(1)
            expect(mockBasketUpdate).not.toHaveBeenCalled()
            expect(mockRemoveAllPaymentInstruments).not.toHaveBeenCalled()
            expect(result).toBe('location-basket-123')
            expect(Logger.error).toHaveBeenCalledWith(
                'resolveReopenedBasket',
                'Could not resolve reopened basket: 404: No current basket'
            )
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
                status: ORDER.ORDER_STATUS_FAILED,
                customerInfo: {customerId: 'different-customer'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            await expect(failOrderAndReopenBasket(mockAdyenContext, 'order123')).rejects.toThrow(
                ERROR_MESSAGE.INVALID_ORDER
            )
            expect(getCurrentBasketForAuthorizedShopper).not.toHaveBeenCalled()
            expect(mockBasketUpdate).not.toHaveBeenCalled()
        })

        it.each(['new', 'completed', 'cancelled', 'failed', 'failed_with_reopen', 'unknown'])(
            'should clean the current basket without failing an existing %s order',
            async (status) => {
                mockGetOrder.mockResolvedValue({
                    orderNo: 'order123',
                    status,
                    customerInfo: {customerId: 'customer-abc'}
                })
                getCustomerBaskets.mockResolvedValue({baskets: [{basketId: 'current-basket-456'}]})
                getCurrentBasketForAuthorizedShopper.mockResolvedValue({
                    basketId: 'current-basket-456',
                    c_orderNo: 'order123'
                })

                const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123')

                expect(mockDeleteBasket).not.toHaveBeenCalled()
                expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
                expect(mockBasketUpdate).toHaveBeenCalledWith(
                    expect.objectContaining({c_orderNo: ''})
                )
                expect(mockRemoveAllPaymentInstruments).toHaveBeenCalled()
                expect(result).toBe('current-basket-456')
            }
        )

        it('should not clean a newer basket for a stale cancelled order number', async () => {
            mockGetOrder.mockResolvedValue({
                orderNo: 'stale-order',
                status: ORDER.ORDER_STATUS_FAILED,
                customerInfo: {customerId: 'customer-abc'}
            })
            getCurrentBasketForAuthorizedShopper.mockResolvedValue({
                basketId: 'current-basket-456',
                c_orderNo: 'new-order'
            })

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'stale-order')

            expect(mockBasketUpdate).not.toHaveBeenCalled()
            expect(mockRemoveAllPaymentInstruments).not.toHaveBeenCalled()
            expect(result).toBeNull()
        })

        it('should handle basket deletion errors gracefully', async () => {
            const mockOrder = {
                orderNo: 'order123',
                status: ORDER.ORDER_STATUS_CREATED,
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
                status: ORDER.ORDER_STATUS_CREATED,
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

        it('should fail the order without deleting or reopening baskets when reopenBasket is false', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({})
            getCustomerBaskets.mockResolvedValue({baskets: [{basketId: 'basket-1'}]})
            const mockDeleteBasket = jest.fn()
            createShopperBasketsClient.mockReturnValue({deleteBasket: mockDeleteBasket})

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123', {
                reopenBasket: false
            })

            expect(mockDeleteBasket).not.toHaveBeenCalled()
            expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
                'order123',
                ORDER.ORDER_STATUS_FAILED
            )
            expect(getBasket).not.toHaveBeenCalled()
            expect(result).toBeNull()
        })

        it('should clear the shipping address on the reopened basket when removeShippingAddress is true', async () => {
            const mockOrder = {
                orderNo: 'order123',
                status: ORDER.ORDER_STATUS_CREATED,
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue('/baskets/new-basket-123')
                }
            })
            const mockRemoveShippingAddress = jest.fn().mockResolvedValue({})
            BasketService.mockImplementation(() => ({
                update: jest.fn().mockResolvedValue({}),
                removeAllPaymentInstruments: jest.fn().mockResolvedValue({}),
                removeShippingAddress: mockRemoveShippingAddress
            }))

            const result = await failOrderAndReopenBasket(mockAdyenContext, 'order123', {
                removeShippingAddress: true
            })

            expect(mockRemoveShippingAddress).toHaveBeenCalled()
            expect(result).toBe('new-basket-123')
        })

        it('should not clear the shipping address by default', async () => {
            const mockOrder = {
                orderNo: 'order123',
                status: ORDER.ORDER_STATUS_CREATED,
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue('/baskets/new-basket-123')
                }
            })
            const mockRemoveShippingAddress = jest.fn().mockResolvedValue({})
            BasketService.mockImplementation(() => ({
                update: jest.fn().mockResolvedValue({}),
                removeAllPaymentInstruments: jest.fn().mockResolvedValue({}),
                removeShippingAddress: mockRemoveShippingAddress
            }))

            await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(mockRemoveShippingAddress).not.toHaveBeenCalled()
        })

        it('should handle basket cleanup errors', async () => {
            const mockOrder = {
                orderNo: 'order123',
                status: ORDER.ORDER_STATUS_CREATED,
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({
                headers: {
                    get: jest.fn().mockReturnValue('/baskets/new-basket-123')
                }
            })
            mockBasketUpdate.mockRejectedValue(new Error('Basket cleanup failed'))

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
            getConfig.mockReturnValue({
                app: {commerceAPI: {parameters: {siteId: 'RefArch'}}}
            })
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

        it('should create an order when lookup reports it does not exist', async () => {
            const notFoundError = Object.assign(new Error('Order not found'), {statusCode: 404})
            mockGetOrder.mockRejectedValue(notFoundError)
            mockCreateOrder.mockResolvedValue({orderNo: 'order123'})

            const result = await createOrderUsingOrderNo(mockAdyenContext)

            expect(mockCreateOrder).toHaveBeenCalledWith(
                'auth',
                'basket-abc',
                'customer-abc',
                'order123',
                'USD'
            )
            expect(result).toEqual({orderNo: 'order123'})
        })

        it('should propagate non-404 lookup errors', async () => {
            const apiError = Object.assign(new Error('Order lookup failed'), {statusCode: 500})
            mockGetOrder.mockRejectedValue(apiError)

            await expect(createOrderUsingOrderNo(mockAdyenContext)).rejects.toBe(apiError)
            expect(mockCreateOrder).not.toHaveBeenCalled()
        })

        it('should return an existing created order without re-creating it', async () => {
            const existingOrder = {orderNo: 'order123', status: ORDER.ORDER_STATUS_CREATED}
            mockGetOrder.mockResolvedValue(existingOrder)

            const result = await createOrderUsingOrderNo(mockAdyenContext)

            expect(result).toEqual(existingOrder)
            expect(mockCreateOrder).not.toHaveBeenCalled()
        })

        it.each(['new', 'completed', 'cancelled', 'failed', 'failed_with_reopen', 'unknown'])(
            'should reject an existing %s order',
            async (status) => {
                mockGetOrder.mockResolvedValue({orderNo: 'order123', status})

                await expect(createOrderUsingOrderNo(mockAdyenContext)).rejects.toMatchObject({
                    message: ERROR_MESSAGE.ORDER_ALREADY_PLACED,
                    statusCode: 409
                })
                expect(mockCreateOrder).not.toHaveBeenCalled()
            }
        )

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

    describe('updateOrderPaymentInstrument', () => {
        const mockUpdateOrderPaymentInstrument = jest.fn()

        beforeEach(() => {
            CustomAdminOrderApiClient.mockImplementation(() => ({
                updateOrderPaymentInstrument: mockUpdateOrderPaymentInstrument
            }))
        })

        it('should call custom admin order API client with expected payload', async () => {
            mockUpdateOrderPaymentInstrument.mockResolvedValue({success: true})

            const result = await updateOrderPaymentInstrument('order-123', 'RefArch', 'psp-123', {
                pspReference: 'psp-123',
                donationToken: 'token-1'
            })

            expect(CustomAdminOrderApiClient).toHaveBeenCalledWith('RefArch')
            expect(mockUpdateOrderPaymentInstrument).toHaveBeenCalledWith('order-123', 'psp-123', {
                pspReference: 'psp-123',
                donationToken: 'token-1'
            })
            expect(result).toEqual({success: true})
        })
    })
})
