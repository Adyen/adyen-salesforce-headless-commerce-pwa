import {AdyenEnvironmentService} from '../environment'
import {ApiClient} from '../api'

jest.mock('../api', () => {
    return {
        ApiClient: jest.fn().mockImplementation(() => ({
            get: jest.fn()
        }))
    }
})

describe('AdyenEnvironmentService', () => {
    let adyenService
    const mockToken = 'mockToken'
    const mockSite = {id: 'RefArch'}

    beforeEach(() => {
        jest.clearAllMocks()
        adyenService = new AdyenEnvironmentService(mockToken, undefined, undefined, mockSite)
    })

    it('should create an instance of ApiClient with correct parameters', () => {
        expect(ApiClient).toHaveBeenCalledWith(
            '/api/adyen/environment',
            mockToken,
            undefined, // customerId
            undefined, // basketId
            mockSite
        )
    })

    describe('fetchEnvironment', () => {
        it('should fetch environment successfully and return JSON', async () => {
            const mockResponse = {ADYEN_CLIENT_KEY: 'test_key'}
            const mockJsonPromise = Promise.resolve(mockResponse)
            const mockFetchPromise = Promise.resolve({
                json: () => mockJsonPromise,
                status: 200
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            const environmentData = await adyenService.fetchEnvironment()

            expect(adyenService.apiClient.get).toHaveBeenCalled()
            expect(environmentData).toEqual(mockResponse)
        })

        it('should throw an error when the API call fails', async () => {
            const mockFetchPromise = Promise.resolve({
                status: 500,
                statusText: 'Internal Server Error',
                json: jest.fn().mockResolvedValue({errorMessage: 'Server error'})
            })

            adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

            await expect(adyenService.fetchEnvironment()).rejects.toThrow('Server error')
        })

        it('should use status-based message when error json has no message', async () => {
            adyenService.apiClient.get.mockResolvedValueOnce(
                Promise.resolve({
                    status: 503,
                    json: jest.fn().mockResolvedValue({})
                })
            )
            await expect(adyenService.fetchEnvironment()).rejects.toThrow(
                'Fetch environment failed with status 503'
            )
        })

        it('should use fallback message when json parsing fails on error', async () => {
            adyenService.apiClient.get.mockResolvedValueOnce(
                Promise.resolve({
                    status: 500,
                    json: jest.fn().mockRejectedValue(new Error('parse error'))
                })
            )
            await expect(adyenService.fetchEnvironment()).rejects.toThrow(
                'Failed to fetch environment'
            )
        })
    })
})
