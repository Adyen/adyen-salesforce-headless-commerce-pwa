import {CustomShopperOrderApiClient} from '../customShopperOrderApi.js'
import {BaseApiClient} from '../baseApiClient.js'

// Mock the parent class
jest.mock('../baseApiClient.js')

describe('CustomShopperOrderApiClient', () => {
    let client
    const originalEnv = process.env

    beforeAll(() => {
        // Set up environment variables for the constructor
        process.env = {
            ...originalEnv,
            COMMERCE_API_SHORT_CODE: 'test_short_code',
            COMMERCE_API_ORG_ID: 'test_org_id',
            COMMERCE_API_SITE_ID: 'RefArch'
        }
    })

    afterAll(() => {
        process.env = originalEnv // Restore original environment
    })

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
        client = new CustomShopperOrderApiClient()
    })

    it('should construct with the correct base URL', () => {
        const expectedBaseUrl = `https://test_short_code.api.commercecloud.salesforce.com/custom/adyen-shopper-order/v1/organizations/test_org_id`
        expect(BaseApiClient).toHaveBeenCalledWith(expectedBaseUrl)
    })

    describe('createOrder', () => {
        it('should call the shopper API with the correct parameters and return the JSON response', async () => {
            // Mock the fetch response
            const mockOrder = {orderNo: '12345', status: 'created'}
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockOrder)
            }
            // Mock the _callShopperApi method on the instance
            client._callShopperApi = jest.fn().mockResolvedValue(mockResponse)

            const auth = 'Bearer shopper_token'
            const basketId = 'basket_abc'
            const customerId = 'customer_xyz'
            const orderNo = '12345'

            const result = await client.createOrder(auth, basketId, customerId, orderNo)

            const expectedUrl = `${client.baseUrl}/orders?siteId=RefArch`
            const expectedOptions = {
                body: JSON.stringify({
                    basketId,
                    customerId,
                    orderNo
                }),
                headers: {
                    authorization: auth
                }
            }

            expect(client._callShopperApi).toHaveBeenCalledWith('POST', 'orders', expectedOptions)
            expect(mockResponse.json).toHaveBeenCalled()
            expect(result).toEqual(mockOrder)
        })
    })
})