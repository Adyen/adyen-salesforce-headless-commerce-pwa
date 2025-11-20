import {
    createShopperBasketsClient,
    getBasket,
    getCurrentBasketForAuthorizedShopper
} from '../basketHelper.js'
import {ShopperBasketsV2} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {AdyenError} from '../../models/AdyenError.js'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

// Mock dependencies
jest.mock('commerce-sdk-isomorphic', () => ({
    ShopperBasketsV2: jest.fn()
}))

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => ({
    getConfig: jest.fn()
}))

describe('basketHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createShopperBasketsClient', () => {
        it('should create a ShopperBaskets client with the correct configuration', () => {
            const mockConfig = {
                app: {
                    commerceAPI: {
                        /* mock commerce API config */
                    }
                }
            }
            getConfig.mockReturnValue(mockConfig)

            const mockAuth = 'Bearer mockToken'
            createShopperBasketsClient(mockAuth)

            expect(getConfig).toHaveBeenCalled()
            expect(ShopperBasketsV2).toHaveBeenCalledWith({
                ...mockConfig.app.commerceAPI,
                headers: {authorization: mockAuth}
            })
        })
    })

    describe('getBasket', () => {
        const mockGetBasket = jest.fn()

        beforeEach(() => {
            ShopperBasketsV2.mockImplementation(() => ({
                getBasket: mockGetBasket
            }))
        })

        it('should return the basket if found and customer ID matches', async () => {
            const mockBasket = {
                basketId: 'basket123',
                customerInfo: {customerId: 'customer-abc'}
            }
            mockGetBasket.mockResolvedValue(mockBasket)

            const result = await getBasket('auth', 'basket123', 'customer-abc')

            expect(mockGetBasket).toHaveBeenCalledWith({parameters: {basketId: 'basket123'}})
            expect(result).toEqual(mockBasket)
        })

        it('should throw AdyenError if basket is not found', async () => {
            mockGetBasket.mockResolvedValue(null)

            await expect(getBasket('auth', 'basket123', 'customer-abc')).rejects.toThrow(
                new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404)
            )
        })

        it('should throw AdyenError if customer ID does not match', async () => {
            const mockBasket = {
                basketId: 'basket123',
                customerInfo: {customerId: 'different-customer'}
            }
            mockGetBasket.mockResolvedValue(mockBasket)

            await expect(getBasket('auth', 'basket123', 'customer-abc')).rejects.toThrow(
                new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404, mockBasket)
            )
        })
    })

    describe('getCurrentBasketForAuthorizedShopper', () => {
        const mockGetCustomerBaskets = jest.fn()

        beforeEach(() => {
            ShopperBasketsV2.mockImplementation(() => ({
                getCustomerBaskets: mockGetCustomerBaskets
            }))
        })

        it('should return the first basket if found', async () => {
            const mockBaskets = {
                baskets: [{basketId: 'basket1'}, {basketId: 'basket2'}]
            }
            mockGetCustomerBaskets.mockResolvedValue(mockBaskets)

            const result = await getCurrentBasketForAuthorizedShopper('auth', 'customer-abc')

            expect(mockGetCustomerBaskets).toHaveBeenCalledWith({
                parameters: {customerId: 'customer-abc'}
            })
            expect(result).toEqual({basketId: 'basket1'})
        })

        it('should throw AdyenError if no baskets property is returned', async () => {
            mockGetCustomerBaskets.mockResolvedValue({})

            await expect(
                getCurrentBasketForAuthorizedShopper('auth', 'customer-abc')
            ).rejects.toThrow(new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404))
        })

        it('should throw AdyenError if the baskets array is empty', async () => {
            mockGetCustomerBaskets.mockResolvedValue({baskets: []})

            await expect(
                getCurrentBasketForAuthorizedShopper('auth', 'customer-abc')
            ).rejects.toThrow(new AdyenError(ERROR_MESSAGE.INVALID_BASKET, 404))
        })
    })
})
