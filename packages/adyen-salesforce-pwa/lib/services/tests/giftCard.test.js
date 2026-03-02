import {GiftCardService} from '../giftCard'
import {ApiClient} from '../api'

jest.mock('../api')

describe('GiftCardService', () => {
    let giftCardService
    const mockToken = 'test-token'
    const mockCustomerId = 'test-customer'
    const mockBasketId = 'test-basket'
    const mockSite = {id: 'RefArch'}

    beforeEach(() => {
        jest.clearAllMocks()
        giftCardService = new GiftCardService(mockToken, mockCustomerId, mockBasketId, mockSite)
    })

    it('should create an instance with the correct properties', () => {
        expect(giftCardService.baseUrl).toBe('/api/adyen/gift-card')
        expect(ApiClient).toHaveBeenCalledWith(
            '/api/adyen/gift-card',
            mockToken,
            mockCustomerId,
            mockBasketId,
            mockSite
        )
    })

    describe('balanceCheck', () => {
        it('should call apiClient.post for balance check and return response', async () => {
            const request = {paymentMethod: {type: 'giftcard'}}
            const mockResponse = {balance: 100}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })
            giftCardService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            const result = await giftCardService.balanceCheck(request)

            expect(giftCardService.apiClient.post).toHaveBeenCalledWith({
                path: '/balance-check',
                body: JSON.stringify({data: request})
            })
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if balance check fails', async () => {
            const request = {paymentMethod: {type: 'giftcard'}}
            const mockFetchPromise = Promise.resolve({
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({message: 'Balance check error'})
            })
            giftCardService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            await expect(giftCardService.balanceCheck(request)).rejects.toThrow(
                'Balance check error'
            )
        })

        it('should use fallback message when json parsing fails on error', async () => {
            giftCardService.apiClient.post.mockResolvedValueOnce(
                Promise.resolve({
                    status: 500,
                    json: jest.fn().mockRejectedValue(new Error('parse error'))
                })
            )
            await expect(giftCardService.balanceCheck({})).rejects.toThrow(
                'Gift card balance check failed'
            )
        })
    })

    describe('createOrder', () => {
        it('should call apiClient.post for create order and return response', async () => {
            const request = {amount: {value: 100, currency: 'USD'}}
            const mockResponse = {orderData: '...'}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })
            giftCardService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            const result = await giftCardService.createOrder(request)

            expect(giftCardService.apiClient.post).toHaveBeenCalledWith({
                path: '/create-order',
                body: JSON.stringify({data: request})
            })
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if create order fails', async () => {
            const request = {amount: {value: 100, currency: 'USD'}}
            const mockFetchPromise = Promise.resolve({
                status: 500,
                statusText: 'Server Error',
                json: jest.fn().mockResolvedValue({message: 'Create order error'})
            })
            giftCardService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            await expect(giftCardService.createOrder(request)).rejects.toThrow('Create order error')
        })

        it('should use fallback message when json parsing fails on error', async () => {
            giftCardService.apiClient.post.mockResolvedValueOnce(
                Promise.resolve({
                    status: 500,
                    json: jest.fn().mockRejectedValue(new Error('parse error'))
                })
            )
            await expect(giftCardService.createOrder({})).rejects.toThrow(
                'Gift card order creation failed'
            )
        })
    })

    describe('cancelOrder', () => {
        it('should call apiClient.post for cancel order and return response', async () => {
            const request = {order: {pspReference: '...'}}
            const mockResponse = {resultCode: 'Received'}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })
            giftCardService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            const result = await giftCardService.cancelOrder(request)

            expect(giftCardService.apiClient.post).toHaveBeenCalledWith({
                path: '/cancel-order',
                body: JSON.stringify({data: request})
            })
            expect(result).toEqual(mockResponse)
        })

        it('should throw an error if cancel order fails', async () => {
            const request = {order: {pspReference: '...'}}
            const mockFetchPromise = Promise.resolve({
                status: 404,
                statusText: 'Not Found',
                json: jest.fn().mockResolvedValue({message: 'Cancel order error'})
            })
            giftCardService.apiClient.post.mockResolvedValueOnce(mockFetchPromise)

            await expect(giftCardService.cancelOrder(request)).rejects.toThrow('Cancel order error')
        })

        it('should use fallback message when json parsing fails on error', async () => {
            giftCardService.apiClient.post.mockResolvedValueOnce(
                Promise.resolve({
                    status: 500,
                    json: jest.fn().mockRejectedValue(new Error('parse error'))
                })
            )
            await expect(giftCardService.cancelOrder({})).rejects.toThrow(
                'Gift card order cancellation failed'
            )
        })
    })
})
