import orderCancel from '../order-cancel'
import {AdyenError} from '../../models/AdyenError'
import Logger from '../../models/logger'
import {failOrderAndReopenBasket} from '../../helpers/orderHelper.js'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

// Mock external modules
jest.mock('../../models/logger')
jest.mock('../../models/orderApi')
jest.mock('commerce-sdk-isomorphic')
jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => {
    return {
        getConfig: jest.fn().mockImplementation(() => {
            return {
                app: {
                    sites: [
                        {
                            id: 'RefArch'
                        }
                    ],
                    commerceAPI: {
                        parameters: {
                            siteId: 'RefArch'
                        }
                    }
                }
            }
        })
    }
})

// Mock the helper function that orderCancel calls
jest.mock('../../helpers/orderHelper.js', () => ({
    failOrderAndReopenBasket: jest.fn()
}))

describe('orderCancel Controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()

        req = {
            body: {
                orderNo: '00012345'
            }
        }
        // Mock res.locals.adyen as it would be set by prepareRequestContext
        res = {
            locals: {
                adyen: {
                    authorization: 'Bearer mockToken',
                    customerId: 'customer-abc',
                    siteId: 'RefArch',
                    basket: {
                        basketId: 'mockBasketId',
                        c_orderNo: '00012345'
                    },
                    adyenConfig: {
                        merchantAccount: 'mockMerchantAccount'
                    },
                    basketService: {
                        update: jest.fn(),
                        removeAllPaymentInstruments: jest.fn()
                    }
                }
            }
        }
        next = jest.fn()
    })

    test('should successfully reopen the basket for a valid order', async () => {
        failOrderAndReopenBasket.mockResolvedValue(undefined) // Simulate successful helper call

        await orderCancel(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('orderCancel', 'start')
        expect(failOrderAndReopenBasket).toHaveBeenCalledWith(res.locals.adyen, '00012345')
        expect(Logger.info).toHaveBeenCalledWith('orderCancel', 'Basket for order 00012345 reopened')
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should call next with an error if failOrderAndReopenBasket throws an error', async () => {
        const mockError = new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 404)
        failOrderAndReopenBasket.mockRejectedValue(mockError)

        await orderCancel(req, res, next)

        expect(Logger.error).toHaveBeenCalledWith('orderCancel', mockError.stack)
        expect(next).toHaveBeenCalledWith(mockError)
    })
})