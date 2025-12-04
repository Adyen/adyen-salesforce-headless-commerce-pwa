import {createShopperCustomerClient, getCustomer} from '../customerHelper.js'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'
import {AdyenError} from '../../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config')
jest.mock('commerce-sdk-isomorphic')

describe('customerHelper', () => {
    const mockConfig = {
        app: {
            commerceAPI: {
                clientId: 'test-client-id',
                organizationId: 'test-org-id',
                shortCode: 'test-shortcode',
                siteId: 'test-site-id'
            }
        }
    }

    const mockCustomer = {
        customerId: 'test-customer-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
    }

    beforeEach(() => {
        jest.clearAllMocks()
        getConfig.mockReturnValue(mockConfig)
    })

    describe('createShopperCustomerClient', () => {
        it('should create a new ShopperCustomers client with correct configuration', () => {
            const authToken = 'test-auth-token'

            createShopperCustomerClient(authToken)

            expect(ShopperCustomers).toHaveBeenCalledWith({
                ...mockConfig.app.commerceAPI,
                headers: {authorization: authToken}
            })
        })
    })

    describe('getCustomer', () => {
        const authToken = 'test-auth-token'
        const customerId = 'test-customer-id'
        let mockClient

        beforeEach(() => {
            mockClient = {
                getCustomer: jest.fn()
            }
            ShopperCustomers.mockImplementation(() => mockClient)
        })

        it('should return customer data when customer exists', async () => {
            mockClient.getCustomer.mockResolvedValue(mockCustomer)

            const result = await getCustomer(authToken, customerId)

            expect(mockClient.getCustomer).toHaveBeenCalledWith({
                parameters: {customerId}
            })
            expect(result).toEqual(mockCustomer)
        })

        it('should throw AdyenError with 404 when customer is not found', async () => {
            mockClient.getCustomer.mockResolvedValue(null)

            await expect(getCustomer(authToken, 'non-existent-id')).rejects.toThrow(AdyenError)

            await expect(getCustomer(authToken, 'non-existent-id')).rejects.toHaveProperty(
                'statusCode',
                404
            )

            await expect(getCustomer(authToken, 'non-existent-id')).rejects.toHaveProperty(
                'message',
                ERROR_MESSAGE.CUSTOMER_NOT_FOUND
            )
        })

        it('should propagate errors from the API client', async () => {
            const apiError = new Error('API Error')
            mockClient.getCustomer.mockRejectedValue(apiError)

            await expect(getCustomer(authToken, customerId)).rejects.toThrow(apiError)
        })
    })
})
