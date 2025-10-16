import {CustomAdminOrderApiClient} from '../customAdminOrderApi.js'
import {BaseApiClient} from '../baseApiClient.js'

// Mock the parent class
jest.mock('../baseApiClient.js')

describe('CustomAdminOrderApiClient', () => {
    let client
    const originalEnv = process.env

    beforeAll(() => {
        // Set up environment variables for the constructor
        process.env = {
            ...originalEnv,
            COMMERCE_API_SHORT_CODE: 'test_short_code',
            COMMERCE_API_ORG_ID: 'test_org_id'
        }
    })

    afterAll(() => {
        process.env = originalEnv // Restore original environment
    })

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
        // Instantiate the client, which will use the mocked BaseApiClient
        client = new CustomAdminOrderApiClient()
    })

    it('should construct with the correct base URL', () => {
        // Check that the BaseApiClient constructor was called with the expected URL
        const expectedBaseUrl = `https://test_short_code.api.commercecloud.salesforce.com/custom/adyen-order/v1/organizations/test_org_id`
        expect(BaseApiClient).toHaveBeenCalledWith(expectedBaseUrl)
    })

    describe('getOrder', () => {
        it('should call _callAdminApi with the correct parameters and return the JSON response', async () => {
            // Mock the response from _callAdminApi
            const mockOrder = {orderNo: '12345', total: 100}
            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockOrder)
            }

            // Mock the _callAdminApi method on the instance
            client._callAdminApi = jest.fn().mockResolvedValue(mockResponse)

            const orderNo = '12345'
            const result = await client.getOrder(orderNo)

            expect(client._callAdminApi).toHaveBeenCalledWith('GET', `orders/${orderNo}`)
            expect(mockResponse.json).toHaveBeenCalled()
            expect(result).toEqual(mockOrder)
        })
    })
})