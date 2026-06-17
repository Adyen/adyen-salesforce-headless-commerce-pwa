import {TerminalApiService} from '../terminal-api'
import {ApiClient} from '../api'

jest.mock('../api')

describe('TerminalApiService', () => {
    let service
    let mockGet
    let mockPost
    const mockToken = 'test-auth-token'
    const mockCustomerId = 'customer-abc-123'
    const mockBasketId = 'basket-xyz-789'
    const mockSite = {id: 'test-site-id'}

    beforeEach(() => {
        jest.clearAllMocks()
        mockGet = jest.fn()
        mockPost = jest.fn()
        ApiClient.mockImplementation(() => {
            return {
                get: mockGet,
                post: mockPost
            }
        })

        service = new TerminalApiService(mockToken, mockCustomerId, mockBasketId, mockSite)
    })

    describe('constructor', () => {
        it('should create an instance of ApiClient with the correct base URL and credentials', () => {
            expect(ApiClient).toHaveBeenCalledTimes(1)
            expect(ApiClient).toHaveBeenCalledWith(
                '/api/adyen/terminal-api',
                mockToken,
                mockCustomerId,
                mockBasketId,
                mockSite
            )
        })
    })

    describe('fetchTerminals', () => {
        const storeId = 'store-001'

        it('should return terminals on successful API call', async () => {
            const mockTerminals = [{poiId: 'V400m-123', name: 'V400m - 123', storeId: 'store-001'}]
            mockGet.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue(mockTerminals)
            })

            const result = await service.fetchTerminals(storeId)

            expect(mockGet).toHaveBeenCalledWith({
                path: '/terminals',
                queryParams: {storeId}
            })
            expect(result).toEqual(mockTerminals)
        })

        it('should throw an error on failed API call', async () => {
            mockGet.mockResolvedValue({
                status: 403,
                json: jest
                    .fn()
                    .mockResolvedValue({errorMessage: 'invalid or unauthorized store id'})
            })

            await expect(service.fetchTerminals(storeId)).rejects.toThrow(
                'invalid or unauthorized store id'
            )
        })

        it('should use status-based message when no message in error json', async () => {
            mockGet.mockResolvedValue({
                status: 500,
                json: jest.fn().mockResolvedValue({})
            })

            await expect(service.fetchTerminals(storeId)).rejects.toThrow(
                'Fetch terminals failed with status 500'
            )
        })

        it('should use fallback message when json parsing fails on error', async () => {
            mockGet.mockResolvedValue({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })

            await expect(service.fetchTerminals(storeId)).rejects.toThrow(
                'Failed to fetch terminals'
            )
        })

        it('should propagate errors if the apiClient.get call itself rejects', async () => {
            const networkError = new Error('Network request failed')
            mockGet.mockRejectedValue(networkError)

            await expect(service.fetchTerminals(storeId)).rejects.toThrow('Network request failed')
        })
    })

    describe('createPayment', () => {
        it('should return payment result on successful API call', async () => {
            const mockResult = {result: 'Success', orderNo: '00001', serviceId: 'svc-123'}
            mockPost.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue(mockResult)
            })

            const result = await service.createPayment({terminalId: 'V400m-123'})

            expect(mockPost).toHaveBeenCalledWith({
                path: '/payment',
                body: JSON.stringify({terminalId: 'V400m-123'})
            })
            expect(result).toEqual(mockResult)
        })

        it('should include serviceId in body when provided', async () => {
            const mockResult = {result: 'Success'}
            mockPost.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue(mockResult)
            })

            await service.createPayment({terminalId: 'V400m-123', serviceId: 'svc-456'})

            expect(mockPost).toHaveBeenCalledWith({
                path: '/payment',
                body: JSON.stringify({terminalId: 'V400m-123', serviceId: 'svc-456'})
            })
        })

        it('should throw an error on failed API call', async () => {
            mockPost.mockResolvedValue({
                status: 400,
                json: jest.fn().mockResolvedValue({errorMessage: 'terminal payment failed'})
            })

            await expect(service.createPayment({terminalId: 'V400m-123'})).rejects.toThrow(
                'terminal payment failed'
            )
        })

        it('should use status-based message when no message in error json', async () => {
            mockPost.mockResolvedValue({
                status: 500,
                json: jest.fn().mockResolvedValue({})
            })

            await expect(service.createPayment({terminalId: 'V400m-123'})).rejects.toThrow(
                'Terminal payment failed with status 500'
            )
        })

        it('should use fallback message when json parsing fails on error', async () => {
            mockPost.mockResolvedValue({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })

            await expect(service.createPayment({terminalId: 'V400m-123'})).rejects.toThrow(
                'Terminal payment failed'
            )
        })
    })

    describe('abortPayment', () => {
        const abortParams = {
            serviceId: 'svc-123',
            terminalId: 'V400m-123'
        }

        it('should return abort result on successful API call', async () => {
            const mockResult = {success: true}
            mockPost.mockResolvedValue({
                status: 200,
                json: jest.fn().mockResolvedValue(mockResult)
            })

            const result = await service.abortPayment(abortParams)

            expect(mockPost).toHaveBeenCalledWith({
                path: '/abort',
                body: JSON.stringify({
                    serviceId: 'svc-123',
                    terminalId: 'V400m-123'
                })
            })
            expect(result).toEqual(mockResult)
        })

        it('should throw an error on failed API call', async () => {
            mockPost.mockResolvedValue({
                status: 400,
                json: jest.fn().mockResolvedValue({errorMessage: 'terminal abort failed'})
            })

            await expect(service.abortPayment(abortParams)).rejects.toThrow('terminal abort failed')
        })

        it('should use status-based message when no message in error json', async () => {
            mockPost.mockResolvedValue({
                status: 500,
                json: jest.fn().mockResolvedValue({})
            })

            await expect(service.abortPayment(abortParams)).rejects.toThrow(
                'Terminal abort failed with status 500'
            )
        })

        it('should use fallback message when json parsing fails on error', async () => {
            mockPost.mockResolvedValue({
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('parse error'))
            })

            await expect(service.abortPayment(abortParams)).rejects.toThrow('Terminal abort failed')
        })

        it('should propagate errors if the apiClient.post call itself rejects', async () => {
            const networkError = new Error('Network request failed')
            mockPost.mockRejectedValue(networkError)

            await expect(service.abortPayment(abortParams)).rejects.toThrow(
                'Network request failed'
            )
        })
    })
})
