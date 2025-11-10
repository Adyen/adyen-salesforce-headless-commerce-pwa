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

    it('calls reject for invalid state and returns undefined', async () => {
        const state = {isValid: false, data: {}}
        const component = {}
        const props = {token: 'mockToken', basket: {basketId: '123', customerId: '456'}}

        const result = await onSubmit(state, component, mockActions, props)

        expect(result).toBeUndefined()
        expect(mockActions.reject).toHaveBeenCalledWith('invalid state')
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

    it('should call reject and return undefined when payment service fails', async () => {
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

        const result = await onSubmit(state, component, mockActions, props)

        expect(result).toBeUndefined()
        expect(mockActions.reject).toHaveBeenCalledWith('Payment failed')
        expect(mockActions.resolve).not.toHaveBeenCalled()
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

    it('should call reject and return undefined when payment details service fails', async () => {
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

        const result = await onAdditionalDetails(state, component, mockActions, props)

        expect(result).toBeUndefined()
        expect(mockActions.reject).toHaveBeenCalledWith('Details submission failed')
        expect(mockActions.resolve).not.toHaveBeenCalled()
    })
})

describe('onErrorHandler', () => {
    let consoleErrorSpy

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('should cancel the order and navigate on success', async () => {
        const navigate = jest.fn()
        const props = {
            token: 'testToken',
            site: 'testSite',
            customerId: 'testCustomer',
            navigate: navigate,
            orderNo: '12345',
            basket: {basketId: 'basket123'}
        }
        const error = new Error('Payment failed')
        const component = {}

        PaymentCancelService.mockImplementation(() => ({
            paymentCancel: jest.fn().mockResolvedValue({})
        }))

        const result = await onErrorHandler(error, component, props)

        expect(PaymentCancelService).toHaveBeenCalledWith(
            props.token,
            props.customerId,
            props.basket.basketId,
            props.site
        )
        expect(navigate).toHaveBeenCalledWith('/checkout')
        expect(result).toEqual({cancelled: true})
        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should handle cancellation errors gracefully', async () => {
        const navigate = jest.fn()
        const props = {
            token: 'testToken',
            site: 'testSite',
            customerId: 'testCustomer',
            navigate: navigate,
            orderNo: '12345',
            basket: {basketId: 'basket123'}
        }
        const error = new Error('Payment failed')
        const component = {}
        const cancelError = new Error('Cancel failed')

        PaymentCancelService.mockImplementation(() => ({
            paymentCancel: jest.fn().mockRejectedValue(cancelError)
        }))

        const result = await onErrorHandler(error, component, props)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error during payment cancellation:',
            cancelError
        )
        expect(result).toEqual({cancelled: false, error: 'Cancel failed'})
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
