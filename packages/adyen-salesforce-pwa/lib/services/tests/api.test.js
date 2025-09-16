import {ApiClient} from '../api'
import {ADYEN_API_BASEPATH} from '../../../__mocks__/adyenApi/constants'

describe('ApiClient', () => {
    let apiClient
    let mockSite = {id: 'RefArch'}

    describe('constructor validation', () => {
        it('should throw an error if url is not provided', () => {
            expect(() => new ApiClient(null, 'mockToken', mockSite)).toThrow(
                'ApiClient constructor: url is required'
            )
        })

        it('should throw an error if token is not provided', () => {
            expect(() => new ApiClient(ADYEN_API_BASEPATH, null, mockSite)).toThrow(
                'ApiClient constructor: token is required'
            )
        })

        it('should throw an error if site is not provided', () => {
            expect(() => new ApiClient(ADYEN_API_BASEPATH, 'mockToken', null)).toThrow(
                'ApiClient constructor: site object with id property is required'
            )
        })

        it('should throw an error if site object is missing id property', () => {
            const mockSiteWithoutId = {name: 'RefArch'}
            expect(() => new ApiClient(ADYEN_API_BASEPATH, 'mockToken', mockSiteWithoutId)).toThrow(
                'ApiClient constructor: site object with id property is required'
            )
        })
    })

    describe('with valid constructor arguments', () => {
        beforeEach(() => {
            apiClient = new ApiClient(ADYEN_API_BASEPATH, 'mockToken', mockSite)
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should construct ApiClient with url, token, and site', () => {
            expect(apiClient.baseUrl).toBe(ADYEN_API_BASEPATH)
            expect(apiClient.token).toBe('mockToken')
            expect(apiClient.site).toBe(mockSite)
        })

        it('should call fetch with correct parameters for GET request', async () => {
            const mockResponse = {data: 'some data'}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                ok: true
            })

            jest.spyOn(global, 'fetch').mockImplementation(() => mockFetchPromise)

            const options = {
                queryParams: {param: 'value'},
                headers: {customHeader: 'customValue'}
            }

            await apiClient.get(options)

            expect(global.fetch).toHaveBeenCalledWith(
                `${ADYEN_API_BASEPATH}?siteId=${mockSite.id}&param=value`,
                expect.objectContaining({
                    method: 'get',
                    body: null,
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `Bearer mockToken`,
                        customHeader: 'customValue'
                    }
                })
            )
        })

        it('should call fetch with correct parameters for POST request', async () => {
            const mockResponse = {success: true}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                ok: true
            })

            jest.spyOn(global, 'fetch').mockImplementation(() => mockFetchPromise)

            const options = {
                body: JSON.stringify({key: 'value'}),
                headers: {customHeader: 'customValue'}
            }

            await apiClient.post(options)

            expect(global.fetch).toHaveBeenCalledWith(
                `${ADYEN_API_BASEPATH}?siteId=${mockSite.id}`,
                expect.objectContaining({
                    method: 'post',
                    body: JSON.stringify({key: 'value'}),
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `Bearer mockToken`,
                        customHeader: 'customValue'
                    }
                })
            )
        })
    })
})
