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
        client = new CustomShopperOrderApiClient('RefArch')
    })

    describe('constructor', () => {
        it('should construct with the correct base URL', () => {
            const expectedBaseUrl = `https://test_short_code.api.commercecloud.salesforce.com/custom/adyen-shopper-order/v1/organizations/test_org_id`
            expect(BaseApiClient).toHaveBeenCalledWith(expectedBaseUrl, 'RefArch')
        })

        it('should handle different environment variables', () => {
            process.env.COMMERCE_API_SHORT_CODE = 'different_code'
            process.env.COMMERCE_API_ORG_ID = 'different_org'

            new CustomShopperOrderApiClient('RefArch')
            const expectedBaseUrl = `https://different_code.api.commercecloud.salesforce.com/custom/adyen-shopper-order/v1/organizations/different_org`
            expect(BaseApiClient).toHaveBeenLastCalledWith(expectedBaseUrl, 'RefArch')

            // Restore original env
            process.env.COMMERCE_API_SHORT_CODE = 'test_short_code'
            process.env.COMMERCE_API_ORG_ID = 'test_org_id'
        })
    })

    describe('generateOrderNo', () => {
        it('should call the shopper API with correct parameters and return order number', async () => {
            const mockResponse = {
                json: jest.fn().mockResolvedValue({orderNo: 'ORDER-12345'})
            }
            client._callShopperApi = jest.fn().mockResolvedValue(mockResponse)

            const authorization = 'Bearer test-token'
            const result = await client.generateOrderNo(authorization)

            expect(client._callShopperApi).toHaveBeenCalledWith('GET', 'orders/order-number', {
                headers: {authorization}
            })
            expect(mockResponse.json).toHaveBeenCalled()
            expect(result).toBe('ORDER-12345')
        })

        it('should handle when response has no orderNo field', async () => {
            const mockResponse = {
                json: jest.fn().mockResolvedValue({someOtherField: 'value'})
            }
            client._callShopperApi = jest.fn().mockResolvedValue(mockResponse)

            const result = await client.generateOrderNo('Bearer test-token')

            expect(result).toBeUndefined()
        })

        it('should handle when response json returns null', async () => {
            const mockResponse = {
                json: jest.fn().mockResolvedValue(null)
            }
            client._callShopperApi = jest.fn().mockResolvedValue(mockResponse)

            await expect(client.generateOrderNo('Bearer test-token')).rejects.toThrow(
                'Cannot read properties of null'
            )
        })

        it('should handle API errors', async () => {
            const apiError = new Error('API call failed')
            client._callShopperApi = jest.fn().mockRejectedValue(apiError)

            await expect(client.generateOrderNo('Bearer test-token')).rejects.toThrow(
                'API call failed'
            )
        })

        it('should handle JSON parsing errors', async () => {
            const jsonError = new Error('JSON parse failed')
            const mockResponse = {
                json: jest.fn().mockRejectedValue(jsonError)
            }
            client._callShopperApi = jest.fn().mockResolvedValue(mockResponse)

            await expect(client.generateOrderNo('Bearer test-token')).rejects.toThrow(
                'JSON parse failed'
            )
        })
    })

    describe('createOrder', () => {
        it('should call the shopper API with the correct parameters and return the JSON response', async () => {
            const mockOrder = {orderNo: '12345', status: 'created'}
            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockOrder)
            }
            client._callShopperApi = jest.fn().mockResolvedValue(mockResponse)

            const auth = 'Bearer shopper_token'
            const basketId = 'basket_abc'
            const customerId = 'customer_xyz'
            const orderNo = '12345'
            const currency = 'USD'
            const result = await client.createOrder(auth, basketId, customerId, orderNo, currency)

            const expectedOptions = {
                body: JSON.stringify({
                    basketId,
                    customerId,
                    orderNo,
                    currency
                }),
                headers: {
                    authorization: auth
                }
            }

            expect(client._callShopperApi).toHaveBeenCalledWith('POST', 'orders', expectedOptions)
            expect(mockResponse.json).toHaveBeenCalled()
            expect(result).toEqual(mockOrder)
        })

        it('should handle API errors during order creation', async () => {
            const apiError = new Error('Order creation failed')
            client._callShopperApi = jest.fn().mockRejectedValue(apiError)

            await expect(
                client.createOrder('Bearer token', 'basket123', 'cust123', 'order123', 'USD')
            ).rejects.toThrow('Order creation failed')
        })

        it('should handle JSON parsing errors during order creation', async () => {
            const jsonError = new Error('Invalid JSON response')
            const mockResponse = {
                json: jest.fn().mockRejectedValue(jsonError)
            }
            client._callShopperApi = jest.fn().mockResolvedValue(mockResponse)

            await expect(
                client.createOrder('Bearer token', 'basket123', 'cust123', 'order123', 'USD')
            ).rejects.toThrow('Invalid JSON response')
        })
    })
})
