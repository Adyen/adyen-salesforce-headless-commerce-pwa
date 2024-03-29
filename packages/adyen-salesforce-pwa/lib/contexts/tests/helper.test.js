import {onPaymentsDetailsSuccess, onPaymentsSuccess} from '../helper'

describe('onPaymentsSuccess', () => {
    it('when response is successful', async () => {
        const state = {}
        const props = {}
        const navigate = jest.fn()
        const responses = {
            paymentsResponse: {
                isSuccessful: true,
                merchantReference: 'test'
            }
        }
        const component = {
            handleAction: jest.fn()
        }
        await onPaymentsSuccess(navigate)(state, component, props, responses)
        expect(navigate).toHaveBeenCalled()
    })

    it('when response is action', async () => {
        const state = {}
        const props = {}
        const navigate = jest.fn()
        const responses = {
            paymentsResponse: {
                isSuccessful: false,
                merchantReference: 'test',
                action: {
                    type: 'Authorised'
                }
            }
        }
        const component = {
            handleAction: jest.fn()
        }
        await onPaymentsSuccess(navigate)(state, component, props, responses)
        expect(component.handleAction).toHaveBeenCalled()
    })

    it('when response action is voucher', async () => {
        const state = {}
        const props = {}
        const navigate = jest.fn()
        const responses = {
            paymentsResponse: {
                isSuccessful: false,
                merchantReference: 'test',
                action: {
                    type: 'voucher'
                }
            }
        }
        const component = {
            handleAction: jest.fn()
        }
        await onPaymentsSuccess(navigate)(state, component, props, responses)
        expect(navigate).toHaveBeenCalled()
    })

    it('when response is not successful', async () => {
        const state = {}
        const props = {}
        const navigate = jest.fn()
        const responses = {
            paymentsResponse: {
                isSuccessful: false,
                merchantReference: 'test'
            }
        }
        const component = {
            handleAction: jest.fn()
        }
        const result = await onPaymentsSuccess(navigate)(state, component, props, responses)
        expect(result instanceof Error).toBeTrue()
    })
})

describe('onPaymentsDetailsSuccess', () => {
    it('when response is successful', async () => {
        const state = {}
        const props = {}
        const navigate = jest.fn()
        const responses = {
            paymentsDetailsResponse: {
                isSuccessful: true,
                merchantReference: 'test'
            }
        }
        const component = {
            handleAction: jest.fn()
        }
        await onPaymentsDetailsSuccess(navigate)(state, component, props, responses)
        expect(navigate).toHaveBeenCalled()
    })

    it('when response is action', async () => {
        const state = {}
        const props = {}
        const navigate = jest.fn()
        const responses = {
            paymentsDetailsResponse: {
                isSuccessful: false,
                merchantReference: 'test',
                action: {
                    type: 'Authorised'
                }
            }
        }
        const component = {
            handleAction: jest.fn()
        }
        await onPaymentsDetailsSuccess(navigate)(state, component, props, responses)
        expect(component.handleAction).toHaveBeenCalled()
    })

    it('when response is not successful', async () => {
        const state = {}
        const props = {}
        const navigate = jest.fn()
        const responses = {
            paymentsDetailsResponse: {
                isSuccessful: false,
                merchantReference: 'test'
            }
        }
        const component = {
            handleAction: jest.fn()
        }
        const result = await onPaymentsDetailsSuccess(navigate)(state, component, props, responses)
        expect(result instanceof Error).toBeTrue()
    })
})
