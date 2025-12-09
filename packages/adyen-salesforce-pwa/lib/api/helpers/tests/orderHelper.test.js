import {
    createOrderUsingOrderNo,
    createShopperOrderClient,
    failOrderAndReopenBasket,
    getOrderUsingOrderNo
} from '../orderHelper.js'
import {ShopperOrders} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {AdyenError} from '../../models/AdyenError.js'
import {ERROR_MESSAGE, ORDER} from '../../../utils/constants.mjs'
import {OrderApiClient} from '../../models/orderApi.js'
import {CustomShopperOrderApiClient} from '../../models/customShopperOrderApi.js'
import {CustomAdminOrderApiClient} from '../../models/customAdminOrderApi.js'

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

describe('orderHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createShopperOrderClient', () => {
        it('should create a ShopperOrders client with the correct configuration', () => {
            const mockConfig = {
                app: {
                    commerceAPI: {
                        /* mock commerce API config */
                    }
                }
            }
            getConfig.mockReturnValue(mockConfig)

            const mockAuth = 'Bearer mockToken'
            createShopperOrderClient(mockAuth)

            expect(getConfig).toHaveBeenCalled()
            expect(ShopperOrders).toHaveBeenCalledWith({
                ...mockConfig.app.commerceAPI,
                headers: {authorization: mockAuth}
            })
        })
    })

    describe('failOrderAndReopenBasket', () => {
        const mockGetOrder = jest.fn()
        const mockUpdateOrderStatus = jest.fn()
        const mockAdyenContext = {
            authorization: 'auth',
            customerId: 'customer-abc'
        }

        beforeEach(() => {
            ShopperOrders.mockImplementation(() => ({
                getOrder: mockGetOrder
            }))
            OrderApiClient.mockImplementation(() => ({
                updateOrderStatus: mockUpdateOrderStatus
            }))
        })

        it('should fail the order and reopen the basket successfully', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            mockUpdateOrderStatus.mockResolvedValue({})

            await failOrderAndReopenBasket(mockAdyenContext, 'order123')

            expect(mockGetOrder).toHaveBeenCalledWith({parameters: {orderNo: 'order123'}})
            expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
                'order123',
                ORDER.ORDER_STATUS_FAILED_REOPEN
            )
        })

        it('should throw AdyenError if order is not found', async () => {
            mockGetOrder.mockResolvedValue({orderNo: null})
            await expect(failOrderAndReopenBasket(mockAdyenContext, 'order123')).rejects.toThrow(
                new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 404)
            )
        })

        it('should throw AdyenError if customer ID does not match', async () => {
            const mockOrder = {
                orderNo: 'order123',
                customerInfo: {customerId: 'different-customer'}
            }
            mockGetOrder.mockResolvedValue(mockOrder)
            await expect(failOrderAndReopenBasket(mockAdyenContext, 'order123')).rejects.toThrow(
                new AdyenError(ERROR_MESSAGE.INVALID_ORDER, 404)
            )
        })
    })

    describe('createOrderUsingOrderNo', () => {
        const mockGetOrder = jest.fn()
        const mockCreateOrder = jest.fn()
        const mockAdyenContext = {
            authorization: 'auth',
            basket: {c_orderNo: 'order123', basketId: 'basket-abc'},
            customerId: 'customer-abc'
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
            mockGetOrder.mockResolvedValue({orderNo: null}) // Order does not exist
            mockCreateOrder.mockResolvedValue({orderNo: 'order123'})

            const result = await createOrderUsingOrderNo(mockAdyenContext)

            expect(mockGetOrder).toHaveBeenCalledWith({parameters: {orderNo: 'order123'}})
            expect(mockCreateOrder).toHaveBeenCalledWith(
                'auth',
                'basket-abc',
                'customer-abc',
                'order123',
                undefined,
                undefined
            )
            expect(result).toEqual({orderNo: 'order123'})
        })

        it('should throw AdyenError if the order already exists', async () => {
            mockGetOrder.mockResolvedValue({orderNo: 'order123'}) // Order exists

            await expect(createOrderUsingOrderNo(mockAdyenContext)).rejects.toThrow(
                new AdyenError(ERROR_MESSAGE.ORDER_ALREADY_EXISTS, 409)
            )
            expect(mockCreateOrder).not.toHaveBeenCalled()
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

            expect(mockGetOrder).toHaveBeenCalledWith('admin-order-123')
            expect(result).toEqual(mockOrder)
        })
    })
})
