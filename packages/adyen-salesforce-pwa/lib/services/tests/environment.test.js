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
    let mockToken = 'mockToken'
    let mockSite = {id: 'RefArch'}

    beforeEach(() => {
        adyenService = new AdyenEnvironmentService(mockToken, mockSite)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should create an instance of AdyenEnvironmentService with ApiClient', () => {
        expect(ApiClient).toHaveBeenCalledWith('/api/adyen/environment', mockToken, mockSite)
    })

    it('should fetch environment successfully', async () => {
        const mockResponse = {environmentData: 'some data'}
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

    it('should throw an error when fetchEnvironment gets a status >= 300', async () => {
        const mockFetchPromise = Promise.resolve({
            status: 400,
            statusText: 'Bad Request'
        })

        adyenService.apiClient.get.mockResolvedValueOnce(mockFetchPromise)

        await expect(adyenService.fetchEnvironment()).rejects.toThrow('[object Object]')
    })
})
