import PaymentMethodsController from '../payment-methods'
import {AdyenError} from '../../models/AdyenError'
import {APPLICATION_VERSION, ERROR_MESSAGE} from '../../../utils/constants.mjs'
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
                        currency: 'USD',
                        customerInfo: {
                            authType: 'registered'
                        }
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
                externalPlatform: {integrator: 'mockIntegrator', name: 'SalesforceCommerceCloud', version: 'PWA'},
                merchantApplication: {name: 'adyen-salesforce-commerce-cloud', version: APPLICATION_VERSION}
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
                externalPlatform: {integrator: 'mockIntegrator', name: 'SalesforceCommerceCloud', version: 'PWA'},
                merchantApplication: {name: 'adyen-salesforce-commerce-cloud', version: APPLICATION_VERSION}
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
