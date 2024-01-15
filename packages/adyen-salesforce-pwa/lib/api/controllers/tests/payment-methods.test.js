import {PaymentMethodsController} from '../../index'

let mockPaymentMethods = jest.fn()
let mockGetCustomerBaskets = jest.fn()

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

jest.mock('../../../utils/getConfig.mjs', () => {
    return {
        getSiteConfig: jest.fn().mockImplementation(() => {
            return {
                clientKey: process.env.ADYEN_CLIENT_KEY,
                environment: process.env.ADYEN_ENVIRONMENT,
                merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
            }
        })
    }
})

jest.mock('commerce-sdk-isomorphic', () => {
    return {
        ShopperCustomers: jest.fn().mockImplementation(() => {
            return {
                getCustomerBaskets: mockGetCustomerBaskets
            }
        })
    }
})
jest.mock('../checkout-config', () => {
    return {
        getInstance: jest.fn().mockImplementation(() => {
            return {
                instance: {
                    paymentMethods: mockPaymentMethods
                }
            }
        })
    }
})
describe('payment methods controller', () => {
    let req, res, next, consoleInfoSpy, consoleErrorSpy

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'mockToken',
                customerid: 'testCustomer'
            },
            query: {
                locale: 'en-US'
            }
        }
        res = {
            locals: {}
        }
        next = jest.fn()
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    it('returns payment method list', async () => {
        mockGetCustomerBaskets.mockImplementationOnce(() => {
            return {
                baskets: [
                    {
                        orderTotal: 100,
                        productTotal: 100,
                        currency: 'USD'
                    }
                ]
            }
        })
        mockPaymentMethods.mockImplementationOnce(() => {
            return {
                paymentMethods: []
            }
        })

        await PaymentMethodsController(req, res, next)
        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                amount: {currency: 'USD', value: 10000},
                blockedPaymentMethods: ['giftcard'],
                countryCode: 'US',
                merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                shopperLocale: 'en-US',
                shopperReference: 'testCustomer'
            },
            {
                idempotencyKey: expect.any(String)
            }
        )
        expect(res.locals.response).toEqual({
            paymentMethods: []
        })
        expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain('getPaymentMethods start')
        expect(consoleInfoSpy.mock.calls[1][0]).toContain('getPaymentMethods success')
        expect(next).toHaveBeenCalled()
    })
    it('returns payment method when basket has productTotal but no orderTotal', async () => {
        mockGetCustomerBaskets.mockImplementationOnce(() => {
            return {
                baskets: [
                    {
                        productTotal: 100,
                        currency: 'USD'
                    }
                ]
            }
        })
        mockPaymentMethods.mockImplementationOnce(() => {
            return {
                paymentMethods: []
            }
        })
        await PaymentMethodsController(req, res, next)
        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                amount: {currency: 'USD', value: 10000},
                blockedPaymentMethods: ['giftcard'],
                countryCode: 'US',
                merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                shopperLocale: 'en-US',
                shopperReference: 'testCustomer'
            },
            {
                idempotencyKey: expect.any(String)
            }
        )
        expect(res.locals.response).toEqual({
            paymentMethods: []
        })
        expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain('getPaymentMethods start')
        expect(consoleInfoSpy.mock.calls[1][0]).toContain('getPaymentMethods success')
        expect(next).toHaveBeenCalled()
    })
    it('returns payment method when basket is empty', async () => {
        mockGetCustomerBaskets.mockImplementationOnce(() => {
            return {
                baskets: []
            }
        })
        mockPaymentMethods.mockImplementationOnce(() => {
            return {
                paymentMethods: []
            }
        })
        await PaymentMethodsController(req, res, next)
        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                blockedPaymentMethods: ['giftcard'],
                countryCode: 'US',
                merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                shopperLocale: 'en-US',
                shopperReference: 'testCustomer'
            },
            {
                idempotencyKey: expect.any(String)
            }
        )
        expect(res.locals.response).toEqual({
            paymentMethods: []
        })
        expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain('getPaymentMethods start')
        expect(consoleInfoSpy.mock.calls[1][0]).toContain('getPaymentMethods success')
        expect(next).toHaveBeenCalled()
    })
    it('returns error when payment method fails', async () => {
        mockGetCustomerBaskets.mockImplementationOnce(() => {
            return {
                baskets: []
            }
        })
        mockPaymentMethods.mockRejectedValueOnce(new Error('failed'))
        await PaymentMethodsController(req, res, next)
        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                blockedPaymentMethods: ['giftcard'],
                countryCode: 'US',
                merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                shopperLocale: 'en-US',
                shopperReference: 'testCustomer'
            },
            {
                idempotencyKey: expect.any(String)
            }
        )
        expect(res.locals.response).toBeNil()
        expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
        expect(consoleInfoSpy.mock.calls[0][0]).toContain('getPaymentMethods start')
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('getPaymentMethods failed')
        expect(next).toHaveBeenCalledWith(new Error('failed'))
    })
})
