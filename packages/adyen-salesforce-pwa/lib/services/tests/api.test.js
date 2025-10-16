import {ApiClient} from '../api'

// Mock the global fetch API
global.fetch = jest.fn()

describe('ApiClient', () => {
    const mockUrl = '/api/test'
    const mockToken = 'mockToken'
    const mockCustomerId = 'mockCustomerId'
    const mockBasketId = 'mockBasketId'
    const mockSite = {id: 'RefArch'}
    let apiClient

    beforeEach(() => {
        jest.clearAllMocks()
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({data: 'success'})
        })
        apiClient = new ApiClient(mockUrl, mockToken, mockCustomerId, mockBasketId, mockSite)
    })

    describe('constructor', () => {
        it('should throw an error if url is not provided', () => {
            expect(() => new ApiClient(null, mockToken, mockCustomerId, mockBasketId, mockSite)).toThrow(
                'ApiClient constructor: url is required'
            )
        })

        it('should throw an error if token is not provided', () => {
            expect(() => new ApiClient(mockUrl, null, mockCustomerId, mockBasketId, mockSite)).toThrow(
                'ApiClient constructor: token is required'
            )
        })

        it('should throw an error if site is not provided', () => {
            expect(() => new ApiClient(mockUrl, mockToken, mockCustomerId, mockBasketId, null)).toThrow(
                'ApiClient constructor: site object with id property is required'
            )
        })

        it('should throw an error if site.id is not provided', () => {
            expect(() => new ApiClient(mockUrl, mockToken, mockCustomerId, mockBasketId, {})).toThrow(
                'ApiClient constructor: site object with id property is required'
            )
        })

        it('should instantiate correctly with all required arguments', () => {
            expect(apiClient.baseUrl).toBe(mockUrl)
            expect(apiClient.token).toBe(mockToken)
            expect(apiClient.customerId).toBe(mockCustomerId)
            expect(apiClient.basketId).toBe(mockBasketId)
            expect(apiClient.site).toEqual(mockSite)
        })

        it('should instantiate correctly even if customerId and basketId are optional', () => {
            const client = new ApiClient(mockUrl, mockToken, undefined, undefined, mockSite)
            expect(client.customerId).toBeUndefined()
            expect(client.basketId).toBeUndefined()
        })
    })

    describe('get', () => {
        it('should make a GET request with correct URL and headers', async () => {
            await apiClient.get()

            const expectedUrl = `${mockUrl}?siteId=${mockSite.id}`
            expect(fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `Bearer ${mockToken}`,
                        customerid: mockCustomerId,
                        basketid: mockBasketId
                    }
                })
            )
        })

        it('should include additional query parameters', async () => {
            await apiClient.get({queryParams: {locale: 'en-US'}})

            const expectedUrl = `${mockUrl}?siteId=${mockSite.id}&locale=en-US`
            expect(fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
        })

        it('should include a path in the URL', async () => {
            await apiClient.get({path: '/sub-path'})

            const expectedUrl = `${mockUrl}/sub-path?siteId=${mockSite.id}`
            expect(fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
        })
    })

    describe('post', () => {
        it('should make a POST request with correct URL, headers, and body', async () => {
            const mockBody = {key: 'value'}
            await apiClient.post({body: JSON.stringify(mockBody)})

            const expectedUrl = `${mockUrl}?siteId=${mockSite.id}`
            expect(fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'post',
                    body: JSON.stringify(mockBody),
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `Bearer ${mockToken}`,
                        customerid: mockCustomerId,
                        basketid: mockBasketId
                    }
                })
            )
        })

        it('should merge additional headers', async () => {
            await apiClient.post({headers: {'X-Custom-Header': 'custom-value'}})

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Custom-Header': 'custom-value'
                    })
                })
            )
        })
    })
})