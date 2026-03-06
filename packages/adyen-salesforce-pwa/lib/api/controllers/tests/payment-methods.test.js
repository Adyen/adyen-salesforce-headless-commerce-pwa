import PaymentMethodsController, {getPaymentMethodsForExpress} from '../payment-methods'
import {AdyenError} from '../../models/AdyenError'
import {
    APPLICATION_VERSION,
    ERROR_MESSAGE,
    EXPRESS_PAYMENT_METHODS
} from '../../../utils/constants.mjs'
import AdyenClientProvider from '../../models/adyenClientProvider'
import Logger from '../../models/logger'

let mockPaymentMethods = jest.fn()

jest.mock('../../models/adyenClientProvider')
jest.mock('../../models/logger')

describe('payment methods controller', () => {
    let req, res, next
    let blockedPaymentMethods = ['wechatpayMiniProgram', 'wechatpayQR', 'wechatpaySDK']

    beforeEach(() => {
        jest.clearAllMocks()

        // Mock AdyenClientProvider to return the mock paymentMethods function
        AdyenClientProvider.mockImplementation(() => ({
            getPaymentsApi: () => ({
                paymentMethods: mockPaymentMethods
            })
        }))

        req = {
            query: {
                siteId: 'RefArch',
                locale: 'en-US'
            }
        }
        res = {
            locals: {
                adyen: {
                    adyenConfig: {
                        merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                        systemIntegratorName: 'mockIntegrator'
                    },
                    basket: {
                        orderTotal: 100,
                        productTotal: 100,
                        currency: 'USD'
                    },
                    customer: {
                        authType: 'registered',
                        customerId: 'testCustomer'
                    },
                    customerId: 'testCustomer'
                }
            }
        }
        next = jest.fn()
    })
    it('returns payment method list', async () => {
        mockPaymentMethods.mockImplementationOnce(() => {
            return {
                paymentMethods: [
                    {
                        name: 'Adyen Voucher',
                        type: 'adyen_test_voucher'
                    }
                ]
            }
        })

        await PaymentMethodsController(req, res, next)
        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                amount: {currency: 'USD', value: 10000},
                blockedPaymentMethods,
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
            paymentMethods: [
                {
                    name: 'Adyen Voucher',
                    type: 'adyen_test_voucher'
                }
            ],
            applicationInfo: {
                externalPlatform: {
                    integrator: 'mockIntegrator',
                    name: 'SalesforceCommerceCloud',
                    version: 'PWA'
                },
                merchantApplication: {
                    name: 'adyen-salesforce-commerce-cloud',
                    version: APPLICATION_VERSION
                }
            }
        })
        expect(Logger.info).toHaveBeenCalledWith('getPaymentMethods', 'start')
        expect(Logger.info).toHaveBeenCalledWith('getPaymentMethods', 'success')
        expect(next).toHaveBeenCalled()
    })
    it('returns payment method when basket has productTotal but no orderTotal', async () => {
        delete res.locals.adyen.basket.orderTotal

        mockPaymentMethods.mockImplementationOnce(() => {
            return {
                paymentMethods: [
                    {
                        name: 'Adyen Voucher',
                        type: 'adyen_test_voucher'
                    }
                ]
            }
        })
        await PaymentMethodsController(req, res, next)
        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                amount: {currency: 'USD', value: 10000},
                blockedPaymentMethods,
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
            paymentMethods: [
                {
                    name: 'Adyen Voucher',
                    type: 'adyen_test_voucher'
                }
            ],
            applicationInfo: {
                externalPlatform: {
                    integrator: 'mockIntegrator',
                    name: 'SalesforceCommerceCloud',
                    version: 'PWA'
                },
                merchantApplication: {
                    name: 'adyen-salesforce-commerce-cloud',
                    version: APPLICATION_VERSION
                }
            }
        })
        expect(Logger.info).toHaveBeenCalledWith('getPaymentMethods', 'start')
        expect(Logger.info).toHaveBeenCalledWith('getPaymentMethods', 'success')
        expect(next).toHaveBeenCalled()
    })
    it('returns error when payment method fails', async () => {
        mockPaymentMethods.mockImplementation(() => {
            return {
                paymentMethods: null
            }
        })
        await PaymentMethodsController(req, res, next)
        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                blockedPaymentMethods,
                countryCode: 'US',
                merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                shopperLocale: 'en-US',
                shopperReference: 'testCustomer',
                amount: {
                    currency: 'USD',
                    value: 10000
                }
            },
            {
                idempotencyKey: expect.any(String)
            }
        )
        expect(Logger.info).toHaveBeenCalledWith('getPaymentMethods', 'start')
        expect(next).toHaveBeenCalledWith(new AdyenError(ERROR_MESSAGE.NO_PAYMENT_METHODS, 400))
    })
})

describe('getPaymentMethodsForExpress controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()

        AdyenClientProvider.mockImplementation(() => ({
            getPaymentsApi: () => ({
                paymentMethods: mockPaymentMethods
            })
        }))

        req = {
            query: {
                locale: 'en-US',
                currency: 'USD'
            }
        }
        res = {
            locals: {
                adyen: {
                    adyenConfig: {
                        merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                        systemIntegratorName: 'mockIntegrator'
                    }
                }
            }
        }
        next = jest.fn()
    })

    it('returns express payment methods successfully', async () => {
        mockPaymentMethods.mockResolvedValue({
            paymentMethods: [{type: 'applepay', name: 'Apple Pay'}]
        })

        await getPaymentMethodsForExpress(req, res, next)

        expect(mockPaymentMethods).toHaveBeenCalledWith(
            {
                allowedPaymentMethods: EXPRESS_PAYMENT_METHODS,
                shopperLocale: 'en-US',
                countryCode: 'US',
                merchantAccount: 'mock_ADYEN_MERCHANT_ACCOUNT',
                amount: {value: 1000, currency: 'USD'}
            },
            {idempotencyKey: expect.any(String)}
        )
        expect(res.locals.response).toEqual({
            paymentMethods: [{type: 'applepay', name: 'Apple Pay'}],
            applicationInfo: {
                externalPlatform: {
                    integrator: 'mockIntegrator',
                    name: 'SalesforceCommerceCloud',
                    version: 'PWA'
                },
                merchantApplication: {
                    name: 'adyen-salesforce-commerce-cloud',
                    version: APPLICATION_VERSION
                }
            }
        })
        expect(Logger.info).toHaveBeenCalledWith('getPaymentMethodsForExpress', 'start')
        expect(Logger.info).toHaveBeenCalledWith('getPaymentMethodsForExpress', 'success')
        expect(next).toHaveBeenCalledWith()
    })

    it('returns error when currency is missing', async () => {
        req.query.currency = undefined

        await getPaymentMethodsForExpress(req, res, next)

        expect(next).toHaveBeenCalledWith(new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400))
        expect(mockPaymentMethods).not.toHaveBeenCalled()
    })

    it('returns error when currency is invalid', async () => {
        req.query.currency = 'INVALID'

        await getPaymentMethodsForExpress(req, res, next)

        expect(next).toHaveBeenCalledWith(new AdyenError('Invalid currency code: INVALID', 400))
        expect(mockPaymentMethods).not.toHaveBeenCalled()
    })

    it('returns error when no payment methods are returned', async () => {
        mockPaymentMethods.mockResolvedValue({paymentMethods: []})

        await getPaymentMethodsForExpress(req, res, next)

        expect(next).toHaveBeenCalledWith(new AdyenError(ERROR_MESSAGE.NO_PAYMENT_METHODS, 400))
    })

    it('calls next with error when paymentMethods API throws', async () => {
        const apiError = new Error('API failure')
        mockPaymentMethods.mockRejectedValue(apiError)

        await getPaymentMethodsForExpress(req, res, next)

        expect(next).toHaveBeenCalledWith(apiError)
        expect(Logger.error).toHaveBeenCalledWith('getPaymentMethodsForExpress', expect.any(String))
    })
})
