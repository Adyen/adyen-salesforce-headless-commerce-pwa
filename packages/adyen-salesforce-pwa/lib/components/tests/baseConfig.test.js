import {
    baseConfig,
    getAmount,
    onAdditionalDetails,
    onErrorHandler,
    onSubmit
} from '../helpers/baseConfig'
import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {PaymentCancelService} from '../../services/payment-cancel'

jest.mock('../../services/payments')
jest.mock('../../services/payments-details')
jest.mock('../../services/payment-cancel')
jest.mock('../../services/giftCard')

describe('baseConfig function', () => {
    const mockProps = {
        beforeSubmit: [],
        afterSubmit: [],
        beforeAdditionalDetails: [],
        afterAdditionalDetails: [],
        onError: [() => {}]
    }

    it('returns expected configuration object', () => {
        const config = baseConfig(mockProps)
        expect(config.amount).toBeDefined()
        expect(config.onSubmit).toBeDefined()
        expect(config.onAdditionalDetails).toBeDefined()
    })
})

describe('onSubmit function', () => {
    let mockActions

    beforeEach(() => {
        mockActions = {
            resolve: jest.fn(),
            reject: jest.fn()
        }
        AdyenPaymentsService.mockImplementation(() => ({
            submitPayment: jest.fn().mockResolvedValue({mockData: 'Mocked response'})
        }))
    })

    it('throws an error and calls reject for invalid state', async () => {
        const state = {isValid: false, data: {}}
        const component = {}
        const props = {token: 'mockToken', basket: {basketId: '123', customerId: '456'}}

        await onSubmit(state, component, mockActions, props)
        expect(mockActions.reject).toHaveBeenCalled()
        expect(mockActions.resolve).not.toHaveBeenCalled()
    })

    it('should call AdyenPaymentsService, resolve the action, and return the payment response', async () => {
        const state = {data: {origin: 'https://adyen.com'}, isValid: true}
        const component = 'testComponent'
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            returnUrl: 'https://adyen.com',
            basket: {basketId: 'basket123'}
        }
        const mockPaymentResponse = {mockData: 'Mocked response'}

        const result = await onSubmit(state, component, mockActions, props)

        expect(result).toEqual({paymentsResponse: mockPaymentResponse})
        expect(mockActions.reject).not.toHaveBeenCalled()
    })

    it('should call reject and throw an error when payment service fails', async () => {
        const state = {data: {origin: 'https://adyen.com'}, isValid: true}
        const component = 'testComponent'
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            returnUrl: 'https://adyen.com',
            basket: {basketId: 'basket123'}
        }
        const mockError = new Error('Payment failed')

        AdyenPaymentsService.mockImplementation(() => ({
            submitPayment: jest.fn().mockRejectedValue(mockError)
        }))

        await onSubmit(state, component, mockActions, props)

        expect(mockActions.reject).toHaveBeenCalled()
    })
})

describe('onAdditionalDetails function', () => {
    let mockActions

    beforeEach(() => {
        mockActions = {
            resolve: jest.fn(),
            reject: jest.fn()
        }
        AdyenPaymentsDetailsService.mockImplementation(() => ({
            submitPaymentsDetails: jest.fn().mockResolvedValue({mockData: 'Mocked response'})
        }))
    })

    it('should call AdyenPaymentsDetailsService, resolve the action, and return the payment details response', async () => {
        const state = {data: 'test data'}
        const component = 'testComponent'
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            basket: {basketId: 'basket123'},
            site: 'RefArch'
        }
        const mockDetailsResponse = {mockData: 'Mocked response'}

        const result = await onAdditionalDetails(state, component, mockActions, props)

        expect(result).toEqual({paymentsDetailsResponse: mockDetailsResponse})
        expect(mockActions.reject).not.toHaveBeenCalled()
    })

    it('should call reject and throw an error when payment details service fails', async () => {
        const state = {data: 'test data'}
        const component = 'testComponent'
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            basket: {basketId: 'basket123'},
            site: 'RefArch'
        }
        const mockError = new Error('Details submission failed')

        AdyenPaymentsDetailsService.mockImplementation(() => ({
            submitPaymentsDetails: jest.fn().mockRejectedValue(mockError)
        }))

        await onAdditionalDetails(state, component, mockActions, props)
        expect(mockActions.reject).toHaveBeenCalled()
    })
})

describe('onErrorHandler', () => {
    it('should cancel the order and navigate', async () => {
        const navigate = jest.fn()
        const props = {
            token: 'testToken',
            site: 'testSite',
            customerId: 'testCustomer',
            navigate: navigate
        }
        const orderNo = '12345'
        PaymentCancelService.mockImplementation(() => ({
            paymentCancel: jest.fn().mockResolvedValue({})
        }))

        await onErrorHandler(orderNo, navigate, props)

        expect(PaymentCancelService).toHaveBeenCalled()
        expect(navigate).toHaveBeenCalledWith('/checkout')
    })
})

describe('getAmount function', () => {
    it('returns null if basket is not provided', () => {
        const props = {}
        expect(getAmount(props)).toBeNull()
    })

    it('returns correct amount object if basket is provided', () => {
        const props = {
            basket: {
                orderTotal: 100,
                currency: 'USD'
            }
        }
        const expectedAmount = {
            value: 10000,
            currency: 'USD'
        }
        expect(getAmount(props)).toEqual(expectedAmount)
    })

    it('returns remainingAmount from adyenOrder if available', () => {
        const props = {
            basket: {
                orderTotal: 100,
                currency: 'USD'
            },
            adyenOrder: {
                remainingAmount: {
                    value: 5000,
                    currency: 'USD'
                }
            }
        }
        const expectedAmount = {
            value: 5000,
            currency: 'USD'
        }
        expect(getAmount(props)).toEqual(expectedAmount)
    })
})
