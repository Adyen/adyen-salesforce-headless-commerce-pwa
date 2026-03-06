import {
    baseConfig,
    getAmount,
    onAdditionalDetails,
    onErrorHandler,
    onSubmit,
    onPaymentsSuccess,
    onPaymentsDetailsSuccess
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

    it('should use getBasket when provided instead of basket', async () => {
        const state = {data: {origin: 'https://adyen.com'}, isValid: true}
        const component = 'testComponent'
        const mockBasket = {basketId: 'dynamic-basket'}
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            returnUrl: 'https://adyen.com',
            getBasket: () => mockBasket,
            site: 'RefArch'
        }

        const result = await onSubmit(state, component, mockActions, props)
        expect(result).toEqual({paymentsResponse: {mockData: 'Mocked response'}})
    })

    it('should use window.location.origin when state.data.origin is falsy', async () => {
        const originalWindow = global.window
        global.window = {
            location: {
                origin: 'http://localhost',
                href: 'http://localhost/checkout'
            }
        }
        const state = {data: {}, isValid: true}
        const component = 'testComponent'
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            basket: {basketId: 'basket123'},
            site: 'RefArch'
        }

        const result = await onSubmit(state, component, mockActions, props)
        expect(result).toEqual({paymentsResponse: {mockData: 'Mocked response'}})
        global.window = originalWindow
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

    it('should use getBasket when provided instead of basket', async () => {
        const state = {data: 'test data'}
        const component = 'testComponent'
        const mockBasket = {basketId: 'dynamic-basket'}
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            getBasket: () => mockBasket,
            site: 'RefArch'
        }

        const result = await onAdditionalDetails(state, component, mockActions, props)
        expect(result).toEqual({paymentsDetailsResponse: {mockData: 'Mocked response'}})
    })

    it('should call error callbacks when failure includes redirectResult', async () => {
        const state = {data: {details: {redirectResult: 'some-result'}}}
        const component = 'testComponent'
        const mockError = new Error('Details failed')
        const onErrorCb = jest.fn()
        const props = {
            token: 'testToken',
            customerId: 'testCustomerId',
            basket: {basketId: 'basket123'},
            site: 'RefArch',
            onError: [onErrorCb]
        }

        AdyenPaymentsDetailsService.mockImplementation(() => ({
            submitPaymentsDetails: jest.fn().mockRejectedValue(mockError)
        }))

        await onAdditionalDetails(state, component, mockActions, props)
        expect(mockActions.reject).toHaveBeenCalledWith('Details failed')
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
        expect(navigate).toHaveBeenCalledWith('/checkout?error=true')
        expect(result).toEqual({cancelled: true})
        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should clear adyenOrder when it exists', async () => {
        const navigate = jest.fn()
        const setAdyenOrder = jest.fn()
        const props = {
            token: 'testToken',
            site: 'testSite',
            customerId: 'testCustomer',
            navigate: navigate,
            orderNo: '12345',
            basket: {basketId: 'basket123'},
            adyenOrder: {orderData: 'some-data'},
            setAdyenOrder
        }

        PaymentCancelService.mockImplementation(() => ({
            paymentCancel: jest.fn().mockResolvedValue({})
        }))

        const result = await onErrorHandler(new Error('fail'), {}, props)
        expect(setAdyenOrder).toHaveBeenCalledWith(null)
        expect(result).toEqual({cancelled: true})
    })

    it('should use getBasket when provided', async () => {
        const navigate = jest.fn()
        const props = {
            token: 'testToken',
            site: 'testSite',
            customerId: 'testCustomer',
            navigate: navigate,
            orderNo: '12345',
            getBasket: () => ({basketId: 'dynamic-basket'})
        }

        PaymentCancelService.mockImplementation(() => ({
            paymentCancel: jest.fn().mockResolvedValue({})
        }))

        const result = await onErrorHandler(new Error('fail'), {}, props)
        expect(result).toEqual({cancelled: true})
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

describe('onPaymentsSuccess', () => {
    let mockActions, mockProps, mockComponent

    beforeEach(() => {
        // Mock window object
        if (typeof window === 'undefined') {
            global.window = {}
        }
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                pathname: '/checkout'
            },
            writable: true,
            configurable: true
        })
        Object.defineProperty(window, 'history', {
            value: {
                pushState: jest.fn()
            },
            writable: true,
            configurable: true
        })

        mockActions = {resolve: jest.fn()}
        mockComponent = {handleAction: jest.fn()}
        mockProps = {
            setOrderNo: jest.fn(),
            setAdyenOrder: jest.fn(),
            setAdyenAction: jest.fn(),
            navigate: jest.fn(),
            orderNo: null,
            adyenOrder: null
        }
    })

    it('should set orderNo when merchantReference differs from current orderNo', async () => {
        const responses = {paymentsResponse: {merchantReference: 'order-123'}}
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.setOrderNo).toHaveBeenCalledWith('order-123')
        expect(mockActions.resolve).toHaveBeenCalledWith(responses.paymentsResponse)
    })

    it('should not set orderNo when merchantReference matches current orderNo', async () => {
        mockProps.orderNo = 'order-123'
        const responses = {paymentsResponse: {merchantReference: 'order-123'}}
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.setOrderNo).not.toHaveBeenCalled()
    })

    it('should set adyenOrder when order data differs', async () => {
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                order: {orderData: 'new-order-data'}
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.setAdyenOrder).toHaveBeenCalledWith({orderData: 'new-order-data'})
    })

    it('should not set adyenOrder when order data matches', async () => {
        mockProps.adyenOrder = {orderData: 'same-data'}
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                order: {orderData: 'same-data'}
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.setAdyenOrder).not.toHaveBeenCalled()
    })

    it('should navigate to confirmation when isSuccessful and isFinal without order', async () => {
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                isSuccessful: true,
                isFinal: true
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.navigate).toHaveBeenCalledWith('/checkout/confirmation/order-123')
    })

    it('should navigate when isSuccessful, isFinal, and order remainingAmount is 0', async () => {
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                isSuccessful: true,
                isFinal: true,
                order: {orderData: 'data', remainingAmount: {value: 0}}
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.navigate).toHaveBeenCalledWith('/checkout/confirmation/order-123')
    })

    it('should not navigate when order remainingAmount > 0', async () => {
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                isSuccessful: true,
                isFinal: true,
                order: {orderData: 'data', remainingAmount: {value: 500}}
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.navigate).not.toHaveBeenCalled()
    })

    it('should handle voucher action type by navigating', async () => {
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                action: {type: 'voucher'}
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.navigate).toHaveBeenCalledWith(
            expect.stringContaining('/checkout/confirmation/order-123?adyenAction=')
        )
    })

    it('should handle threeDS2 action type by setting adyenAction', async () => {
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                action: {type: 'threeDS2'}
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.setAdyenAction).toHaveBeenCalled()
    })

    it('should handle default action type by calling component.handleAction', async () => {
        const responses = {
            paymentsResponse: {
                merchantReference: 'order-123',
                action: {type: 'redirect', url: 'https://example.com'}
            }
        }
        await onPaymentsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockComponent.handleAction).toHaveBeenCalledWith({
            type: 'redirect',
            url: 'https://example.com'
        })
    })
})

describe('onPaymentsDetailsSuccess', () => {
    let mockActions, mockProps, mockComponent

    beforeEach(() => {
        mockActions = {resolve: jest.fn()}
        mockComponent = {handleAction: jest.fn()}
        mockProps = {
            navigate: jest.fn(),
            setAdyenAction: jest.fn()
        }
    })

    it('should navigate on successful payment details', async () => {
        const responses = {
            paymentsDetailsResponse: {
                isSuccessful: true,
                merchantReference: 'order-456'
            }
        }
        await onPaymentsDetailsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.navigate).toHaveBeenCalledWith('/checkout/confirmation/order-456')
        expect(mockActions.resolve).toHaveBeenCalledWith(responses.paymentsDetailsResponse)
    })

    it('should handle action when not successful but action present', async () => {
        const responses = {
            paymentsDetailsResponse: {
                isSuccessful: false,
                merchantReference: 'order-456',
                action: {type: 'voucher'}
            }
        }
        await onPaymentsDetailsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.navigate).toHaveBeenCalledWith(
            expect.stringContaining('/checkout/confirmation/order-456?adyenAction=')
        )
    })

    it('should call component.handleAction for default action types', async () => {
        const responses = {
            paymentsDetailsResponse: {
                isSuccessful: false,
                merchantReference: 'order-456',
                action: {type: 'redirect', url: 'https://example.com'}
            }
        }
        await onPaymentsDetailsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockComponent.handleAction).toHaveBeenCalledWith({
            type: 'redirect',
            url: 'https://example.com'
        })
    })

    it('should resolve without navigating when no success and no action', async () => {
        const responses = {
            paymentsDetailsResponse: {isSuccessful: false}
        }
        await onPaymentsDetailsSuccess({}, mockComponent, mockActions, mockProps, responses)
        expect(mockProps.navigate).not.toHaveBeenCalled()
        expect(mockActions.resolve).toHaveBeenCalledWith(responses.paymentsDetailsResponse)
    })
})
