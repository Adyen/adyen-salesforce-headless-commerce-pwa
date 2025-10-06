import {onPaymentsDetailsSuccess, onPaymentsSuccess} from '../helper'

describe('Adyen Context Helpers', () => {
    let navigate, setOrderNo, setAdyenOrder, component, mockActions

    beforeEach(() => {
        navigate = jest.fn()
        setOrderNo = jest.fn()
        setAdyenOrder = jest.fn()
        component = {
            handleAction: jest.fn()
        }
        mockActions = {
            resolve: jest.fn(),
            reject: jest.fn()
        }
    })

    describe('onPaymentsSuccess', () => {
        it('should set order number and navigate on successful full payment', async () => {
            const responses = {
                paymentsResponse: {
                    isSuccessful: true,
                    isFinal: true,
                    merchantReference: 'ORDER-123'
                }
            }

            const handler = onPaymentsSuccess(navigate, setOrderNo, setAdyenOrder)
            await handler(null, component, mockActions, null, responses)

            expect(setOrderNo).toHaveBeenCalledWith('ORDER-123')
            expect(setAdyenOrder).not.toHaveBeenCalled()
            expect(navigate).toHaveBeenCalledWith('/checkout/confirmation/ORDER-123')
        })

        it('should set partial order data and not navigate if there is a remaining amount', async () => {
            const responses = {
                paymentsResponse: {
                    isSuccessful: true,
                    isFinal: false,
                    merchantReference: 'ORDER-123',
                    order: {
                        orderData: '...',
                        remainingAmount: {value: 5000}
                    }
                }
            }

            const handler = onPaymentsSuccess(navigate, setOrderNo, setAdyenOrder)
            await handler(null, component, mockActions, null, responses)

            expect(setOrderNo).toHaveBeenCalledWith('ORDER-123')
            expect(setAdyenOrder).toHaveBeenCalledWith(responses.paymentsResponse.order)
            expect(navigate).not.toHaveBeenCalled()
        })

        it('should navigate on successful final partial payment (remainingAmount is zero)', async () => {
            const responses = {
                paymentsResponse: {
                    isSuccessful: true,
                    isFinal: true,
                    merchantReference: 'ORDER-123',
                    order: {
                        orderData: '...',
                        remainingAmount: {value: 0}
                    }
                }
            }

            const handler = onPaymentsSuccess(navigate, setOrderNo, setAdyenOrder)
            await handler(null, component, mockActions, null, responses)

            expect(setOrderNo).toHaveBeenCalledWith('ORDER-123')
            expect(setAdyenOrder).toHaveBeenCalledWith(responses.paymentsResponse.order)
            expect(navigate).toHaveBeenCalledWith('/checkout/confirmation/ORDER-123')
        })

        it('should handle a redirect action', async () => {
            const action = {type: 'redirect', url: 'https://example.com/redirect'}
            const responses = {
                paymentsResponse: {
                    action: action
                }
            }
            const encodedAction = btoa(JSON.stringify(action))
            const handler = onPaymentsSuccess(navigate, setOrderNo, setAdyenOrder)
            await handler(null, component, mockActions, null, responses)

            expect(navigate).toHaveBeenCalledWith(`/checkout?adyenAction=${encodedAction}`)
        })

        it('should handle a voucher action by navigating', async () => {
            const action = {type: 'voucher', reference: 'VOUCHER-ABC'}
            const responses = {
                paymentsResponse: {
                    action: action,
                    merchantReference: 'ORDER-123'
                }
            }

            const handler = onPaymentsSuccess(navigate, setOrderNo, setAdyenOrder)
            await handler(null, component, mockActions, null, responses)

            const encodedAction = btoa(JSON.stringify(action))
            expect(navigate).toHaveBeenCalledWith(
                `/checkout/confirmation/ORDER-123?adyenAction=${encodedAction}`
            )
            expect(component.handleAction).not.toHaveBeenCalled()
        })

        it('should do nothing if payment is not successful and there is no action', async () => {
            const responses = {
                paymentsResponse: {
                    isSuccessful: false,
                    isFinal: true
                }
            }

            const handler = onPaymentsSuccess(navigate, setOrderNo, setAdyenOrder)
            await handler(null, component, mockActions, null, responses)

            expect(navigate).not.toHaveBeenCalled()
            expect(component.handleAction).not.toHaveBeenCalled()
            expect(setOrderNo).not.toHaveBeenCalled()
        })
    })

    describe('onPaymentsDetailsSuccess', () => {
        it('should navigate to confirmation on successful payment details response', async () => {
            const responses = {
                paymentsDetailsResponse: {
                    isSuccessful: true,
                    merchantReference: 'ORDER-123'
                }
            }

            const handler = onPaymentsDetailsSuccess(navigate)
            await handler(null, component, mockActions, null, responses)

            expect(navigate).toHaveBeenCalledWith('/checkout/confirmation/ORDER-123')
        })

        it('should handle an action from the payment details response', async () => {
            const action = {type: 'challenge', token: '...'}
            const responses = {
                paymentsDetailsResponse: {
                    isSuccessful: false,
                    action: action
                }
            }

            const handler = onPaymentsDetailsSuccess(navigate)
            await handler(null, component, mockActions, null, responses)

            expect(component.handleAction).toHaveBeenCalledWith(action)
            expect(navigate).not.toHaveBeenCalled()
        })

        it('should do nothing if not successful and no action is present', async () => {
            const responses = {
                paymentsDetailsResponse: {
                    isSuccessful: false,
                    action: null
                }
            }

            const handler = onPaymentsDetailsSuccess(navigate)
            await handler(null, component, mockActions, null, responses)

            expect(navigate).not.toHaveBeenCalled()
            expect(component.handleAction).not.toHaveBeenCalled()
        })
    })
})