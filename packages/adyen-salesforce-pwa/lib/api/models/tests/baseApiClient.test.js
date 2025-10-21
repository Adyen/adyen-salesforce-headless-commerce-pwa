import {BaseApiClient} from '../baseApiClient.js'
import fetch from 'node-fetch'

// Mock node-fetch
jest.mock('node-fetch')

describe('BaseApiClient', () => {
    const baseUrl = 'https://api.example.com'
    let client
    const originalEnv = process.env

    beforeAll(() => {
        // Set up environment variables for tests
        process.env = {
            ...originalEnv,
            COMMERCE_API_CLIENT_ID_PRIVATE: 'test_client_id',
            COMMERCE_API_CLIENT_SECRET: 'test_client_secret',
            SFCC_REALM_ID: 'test_realm',
            SFCC_INSTANCE_ID: 'test_instance',
            SFCC_OAUTH_SCOPES: 'test_scope',
            COMMERCE_API_SITE_ID: 'RefArch'
        }
    })

    afterAll(() => {
        process.env = originalEnv // Restore original environment
    })

    beforeEach(() => {
        jest.clearAllMocks()
        client = new BaseApiClient(baseUrl)
    })

    describe('constructor', () => {
        it('should throw an error if baseUrl is not provided', () => {
            expect(() => new BaseApiClient()).toThrow(
                'baseUrl is required to instantiate an API client.'
            )
        })

        it('should instantiate correctly with a baseUrl', () => {
            expect(client).toBeInstanceOf(BaseApiClient)
        })
    })

    describe('_callAdminApi', () => {
        const mockTokenResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({
                access_token: 'mock_admin_token',
                expires_in: 1800
            })
        }

        const mockApiResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({data: 'success'})
        }

        it('should fetch a new token and make a successful API call', async () => {
            fetch.mockResolvedValueOnce(mockTokenResponse).mockResolvedValueOnce(mockApiResponse)

            const response = await client._callAdminApi('GET', 'test/path')
            const responseData = await response.json()

            expect(fetch).toHaveBeenCalledTimes(2)
            // Token fetch call
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('oauth2/access_token'),
                expect.any(Object)
            )
            // API call
            expect(fetch).toHaveBeenCalledWith(
                `${baseUrl}/test/path?siteId=RefArch`,
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        authorization: 'Bearer mock_admin_token'
                    })
                })
            )
            expect(responseData).toEqual({data: 'success'})
        })

        it('should use a cached token for subsequent calls', async () => {
            fetch.mockResolvedValueOnce(mockTokenResponse).mockResolvedValue(mockApiResponse)

            // First call
            await client._callAdminApi('GET', 'test/path1')
            // Second call
            await client._callAdminApi('GET', 'test/path2')

            // Token should only be fetched once
            expect(fetch).toHaveBeenCalledTimes(3)
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('oauth2/access_token'),
                expect.any(Object)
            )
        })

        it('should fetch a new token if the cached one is expired', async () => {
            const dateNowSpy = jest.spyOn(Date, 'now')

            // First call, get the token
            dateNowSpy.mockReturnValue(0)
            fetch.mockResolvedValueOnce(mockTokenResponse).mockResolvedValue(mockApiResponse)
            await client._callAdminApi('GET', 'test/path1')

            // Second call, after token has expired
            // expires_in is 1800s, so 1800 * 1000 ms later it should be expired
            dateNowSpy.mockReturnValue(1800 * 1000)
            fetch.mockResolvedValueOnce(mockTokenResponse).mockResolvedValue(mockApiResponse)
            await client._callAdminApi('GET', 'test/path2')

            // Token should be fetched twice
            expect(fetch).toHaveBeenCalledTimes(4)
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('oauth2/access_token'),
                expect.any(Object)
            )

            dateNowSpy.mockRestore()
        })

        it('should throw an error if the token fetch fails', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Invalid credentials'
            })

            await expect(client._callAdminApi('GET', 'test/path')).rejects.toThrow(
                '401 Unauthorized'
            )
        })

        it('should throw an error if the API call fails', async () => {
            fetch.mockResolvedValueOnce(mockTokenResponse).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: async () => 'Internal error'
            })

            await expect(client._callAdminApi('GET', 'test/path')).rejects.toThrow(
                '500 Server Error'
            )
        })
    })

    describe('_callShopperApi', () => {
        const mockApiResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({data: 'success'})
        }

        it('should make a successful API call with shopper headers', async () => {
            fetch.mockResolvedValueOnce(mockApiResponse)
            const shopperHeaders = {authorization: 'Bearer shopper_token'}

            const response = await client._callShopperApi('POST', 'test/path', {
                headers: shopperHeaders,
                body: JSON.stringify({key: 'value'})
            })
            const responseData = await response.json()

            expect(fetch).toHaveBeenCalledTimes(1)
            expect(fetch).toHaveBeenCalledWith(
                `${baseUrl}/test/path?siteId=RefArch`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining(shopperHeaders)
                })
            )
            expect(responseData).toEqual({data: 'success'})
        })

        it('should throw an error if the API call fails', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: async () => 'Endpoint not found'
            })

            await expect(client._callShopperApi('GET', 'test/path')).rejects.toThrow(
                '404 Not Found'
            )
        })
    })
})
