// Mock node-fetch
jest.mock('node-fetch')

describe('BaseApiClient', () => {
    const baseUrl = 'https://api.example.com'
    let BaseApiClient
    let fetch
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

    beforeEach(async () => {
        jest.clearAllMocks()
        // Reload the module so each test starts with an empty, module-level token cache
        jest.resetModules()
        ;({default: fetch} = await import('node-fetch'))
        ;({BaseApiClient} = await import('../baseApiClient.js'))
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

        it('should share the cached token across instances and subclasses', async () => {
            class OtherApiClient extends BaseApiClient {}
            fetch.mockResolvedValueOnce(mockTokenResponse).mockResolvedValue(mockApiResponse)

            await new BaseApiClient(baseUrl)._callAdminApi('GET', 'test/path1')
            await new BaseApiClient(baseUrl, 'OtherSite')._callAdminApi('GET', 'test/path2')
            await new OtherApiClient('https://other.example.com')._callAdminApi('GET', 'path3')

            const tokenCalls = fetch.mock.calls.filter(([url]) =>
                url.includes('oauth2/access_token')
            )
            expect(tokenCalls).toHaveLength(1)
            expect(fetch).toHaveBeenCalledTimes(4)
        })

        it('should not cache a token when the token fetch fails', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                    text: async () => 'Rate limited'
                })
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce(mockApiResponse)

            await expect(client._callAdminApi('GET', 'test/path')).rejects.toThrow(
                '429 Too Many Requests'
            )
            await client._callAdminApi('GET', 'test/path')

            const tokenCalls = fetch.mock.calls.filter(([url]) =>
                url.includes('oauth2/access_token')
            )
            expect(tokenCalls).toHaveLength(2)
        })

        it('should refresh the token and retry once on a 401 from the API', async () => {
            fetch
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    text: async () => 'Token revoked'
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        access_token: 'fresh_admin_token',
                        expires_in: 1800
                    })
                })
                .mockResolvedValueOnce(mockApiResponse)

            const response = await client._callAdminApi('PATCH', 'orders/123', {body: '{}'})

            expect(response).toBe(mockApiResponse)
            expect(fetch).toHaveBeenCalledTimes(4)
            expect(fetch).toHaveBeenLastCalledWith(
                `${baseUrl}/orders/123?siteId=RefArch`,
                expect.objectContaining({
                    method: 'PATCH',
                    body: '{}',
                    headers: expect.objectContaining({
                        authorization: 'Bearer fresh_admin_token'
                    })
                })
            )

            // The fresh token is cached for subsequent calls
            fetch.mockResolvedValueOnce(mockApiResponse)
            await client._callAdminApi('GET', 'test/path')
            expect(fetch).toHaveBeenCalledTimes(5)
            expect(fetch).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        authorization: 'Bearer fresh_admin_token'
                    })
                })
            )
        })

        it('should throw without retrying again if the API returns 401 after a refresh', async () => {
            const unauthorizedResponse = {
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Forbidden'
            }
            fetch
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce(unauthorizedResponse)
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce(unauthorizedResponse)

            await expect(client._callAdminApi('GET', 'test/path')).rejects.toThrow(
                '401 Unauthorized'
            )
            expect(fetch).toHaveBeenCalledTimes(4)
        })

        it('should not drop a fresh token cached by a concurrent request on a 401', async () => {
            const dateNowSpy = jest.spyOn(Date, 'now')
            dateNowSpy.mockReturnValue(0)

            let resolveStaleCall
            const staleCall = new Promise((resolve) => {
                resolveStaleCall = resolve
            })
            fetch
                .mockResolvedValueOnce(mockTokenResponse) // first token: mock_admin_token
                .mockReturnValueOnce(staleCall) // API call with the first token, still pending

            const firstRequest = client._callAdminApi('GET', 'test/path1')
            await new Promise((resolve) => setImmediate(resolve))

            // Meanwhile the first token expires and another request caches a fresh one
            dateNowSpy.mockReturnValue(1800 * 1000)
            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        access_token: 'fresh_admin_token',
                        expires_in: 1800
                    })
                })
                .mockResolvedValueOnce(mockApiResponse)
            await client._callAdminApi('GET', 'test/path2')

            // The first request now gets a 401 for the old token and retries
            fetch.mockResolvedValueOnce(mockApiResponse)
            resolveStaleCall({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Token expired'
            })
            await firstRequest

            // The retry reused the fresh token instead of requesting a new one
            const tokenCalls = fetch.mock.calls.filter(([url]) =>
                url.includes('oauth2/access_token')
            )
            expect(tokenCalls).toHaveLength(2)
            expect(fetch).toHaveBeenLastCalledWith(
                `${baseUrl}/test/path1?siteId=RefArch`,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        authorization: 'Bearer fresh_admin_token'
                    })
                })
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

        it('should never fetch an admin token', async () => {
            fetch.mockResolvedValueOnce(mockApiResponse)

            await client._callShopperApi('GET', 'test/path')

            expect(fetch).toHaveBeenCalledTimes(1)
            expect(fetch).not.toHaveBeenCalledWith(
                expect.stringContaining('oauth2/access_token'),
                expect.any(Object)
            )
        })

        it('should send null body when no options are provided', async () => {
            fetch.mockResolvedValueOnce(mockApiResponse)

            await client._callShopperApi('GET', 'test/path')

            expect(fetch).toHaveBeenCalledWith(
                `${baseUrl}/test/path?siteId=RefArch`,
                expect.objectContaining({body: null})
            )
        })

        it('should include Content-Type application/json header by default', async () => {
            fetch.mockResolvedValueOnce(mockApiResponse)

            await client._callShopperApi('GET', 'test/path')

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            )
        })

        it('should merge custom headers with the default Content-Type header', async () => {
            fetch.mockResolvedValueOnce(mockApiResponse)
            const customHeaders = {authorization: 'Bearer shopper_token', 'x-custom': 'value'}

            await client._callShopperApi('GET', 'test/path', {headers: customHeaders})

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        ...customHeaders
                    })
                })
            )
        })

        it('should append siteId from config to the URL', async () => {
            fetch.mockResolvedValueOnce(mockApiResponse)

            await client._callShopperApi('GET', 'orders/123')

            expect(fetch).toHaveBeenCalledWith(
                `${baseUrl}/orders/123?siteId=RefArch`,
                expect.any(Object)
            )
        })
    })
})
