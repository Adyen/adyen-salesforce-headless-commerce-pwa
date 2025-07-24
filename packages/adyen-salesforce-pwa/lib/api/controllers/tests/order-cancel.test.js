import orderCancel from '../order-cancel'
import {AdyenError} from '../../models/AdyenError'
import {OrderApiClient} from '../orderApi'
import {ShopperOrders} from 'commerce-sdk-isomorphic'
import Logger from '../logger'
import {ORDER} from '../../../utils/constants.mjs'

// Mock external modules
jest.mock('../logger')
jest.mock('../orderApi')
jest.mock('commerce-sdk-isomorphic')

// Mock the global appConfig that the controller depends on
global.appConfig = {
    commerceAPI: {
        clientId: 'test-client-id',
        organizationId: 'test-org-id',
        shortCode: 'test-short-code',
        siteId: 'test-site-id'
    }
}

describe('orderCancel Controller', () => {
    let req, res, next
    const mockGetOrder = jest.fn()
    const mockUpdateOrderStatus = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()

        req = {
            body: {
                orderNo: '00012345'
            },
            headers: {
                authorization: 'Bearer mockToken',
                customerid: 'customer-abc'
            }
        }
        res = {} // res is not used in the function
        next = jest.fn()

        // Set up the mock for the ShopperOrders class
        ShopperOrders.mockImplementation(() => ({
            getOrder: mockGetOrder
        }))

        // Set up the mock for the OrderApiClient class
        OrderApiClient.mockImplementation(() => ({
            updateOrderStatus: mockUpdateOrderStatus
        }))
    })

    test('should successfully reopen the basket for a valid order', async () => {
        const mockOrder = {
            orderNo: '00012345',
            customerInfo: {
                customerId: 'customer-abc'
            }
        }
        mockGetOrder.mockResolvedValue(mockOrder)
        mockUpdateOrderStatus.mockResolvedValue({success: true})

        await orderCancel(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('orderCancel', 'start')
        expect(mockGetOrder).toHaveBeenCalledWith({
            parameters: {
                orderNo: '00012345'
            }
        })
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
            '00012345',
            ORDER.ORDER_STATUS_FAILED_REOPEN
        )
        expect(Logger.info).toHaveBeenCalledWith('orderCancel', 'basket reopened')
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should call next with an AdyenError if the order is not found', async () => {
        mockGetOrder.mockResolvedValue(null) // Simulate order not found

        await orderCancel(req, res, next)

        const expectedError = new AdyenError('order is invalid', 404, 'null')

        expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
        expect(Logger.error).toHaveBeenCalledWith('orderCancel', JSON.stringify(expectedError))
        expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
        expect(next.mock.calls[0][0].message).toBe('order is invalid')
        expect(next.mock.calls[0][0].statusCode).toBe(404)
    })

    test('should call next with an AdyenError if the customer ID does not match', async () => {
        const mockOrder = {
            orderNo: '00012345',
            customerInfo: {
                customerId: 'different-customer-id' // Mismatched customer
            }
        }
        mockGetOrder.mockResolvedValue(mockOrder)

        await orderCancel(req, res, next)

        const expectedError = new AdyenError('order is invalid', 404, JSON.stringify(mockOrder))

        expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
        expect(Logger.error).toHaveBeenCalledWith('orderCancel', JSON.stringify(expectedError))
        expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
        expect(next.mock.calls[0][0].message).toBe('order is invalid')
    })

    test('should call next with an error if getOrder API call fails', async () => {
        const apiError = new Error('API connection failed')
        mockGetOrder.mockRejectedValue(apiError)

        await orderCancel(req, res, next)

        expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
        expect(Logger.error).toHaveBeenCalledWith('orderCancel', JSON.stringify(apiError))
        expect(next).toHaveBeenCalledWith(apiError)
    })

    test('should call next with an error if updateOrderStatus API call fails', async () => {
        const mockOrder = {
            orderNo: '00012345',
            customerInfo: {
                customerId: 'customer-abc'
            }
        }
        const apiError = new Error('Failed to update status')
        mockGetOrder.mockResolvedValue(mockOrder)
        mockUpdateOrderStatus.mockRejectedValue(apiError)

        await orderCancel(req, res, next)

        expect(mockUpdateOrderStatus).toHaveBeenCalled()
        expect(Logger.error).toHaveBeenCalledWith('orderCancel', JSON.stringify(apiError))
        expect(next).toHaveBeenCalledWith(apiError)
    })
})