/**
 * @jest-environment jsdom
 */
import {renderHook} from '@testing-library/react'
import usePaymentMethodsConfiguration from '../usePaymentMethodsConfiguration'
import {paymentMethodsConfiguration as getPaymentMethodsConfig} from '../../components/paymentMethodsConfiguration'

jest.mock('../../components/paymentMethodsConfiguration')
jest.mock('../../contexts/helper', () => ({
    onPaymentsSuccess: jest.fn(),
    onPaymentsDetailsSuccess: jest.fn()
}))

describe('usePaymentMethodsConfiguration', () => {
    const mockConfig = {card: {hasHolderName: true}}

    beforeEach(() => {
        jest.clearAllMocks()
        getPaymentMethodsConfig.mockReturnValue(mockConfig)
    })

    it('should return a function that calls paymentMethodsConfiguration', async () => {
        const props = {
            adyenPaymentMethods: {paymentMethods: [{type: 'scheme'}]},
            adyenOrder: null,
            orderNo: null,
            isCustomerRegistered: true,
            merchantDisplayName: 'Test',
            token: 'test-token',
            site: {id: 'RefArch'},
            basket: {basketId: 'b1'},
            returnUrl: '/checkout',
            customerId: 'c1',
            setAdyenOrder: jest.fn(),
            setAdyenAction: jest.fn(),
            setOrderNo: jest.fn(),
            navigate: jest.fn(),
            adyenConfig: {
                paymentMethodsConfiguration: {card: {}},
                onError: [jest.fn()],
                afterSubmit: [jest.fn()],
                beforeSubmit: [jest.fn()],
                afterAdditionalDetails: [jest.fn()],
                beforeAdditionalDetails: [jest.fn()]
            }
        }

        const {result} = renderHook(() => usePaymentMethodsConfiguration(props))

        const configResult = await result.current({
            beforeSubmit: [],
            afterSubmit: [],
            beforeAdditionalDetails: [],
            afterAdditionalDetails: [],
            onError: []
        })

        expect(getPaymentMethodsConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                additionalPaymentMethodsConfiguration: {card: {}},
                token: 'test-token',
                site: {id: 'RefArch'},
                isCustomerRegistered: true
            })
        )
        expect(configResult).toEqual(mockConfig)
    })

    it('should handle missing adyenConfig gracefully', async () => {
        const props = {
            adyenPaymentMethods: {paymentMethods: []},
            adyenOrder: null,
            orderNo: null,
            isCustomerRegistered: false,
            merchantDisplayName: '',
            token: 'token',
            site: {id: 'RefArch'},
            basket: {basketId: 'b1'},
            returnUrl: '/checkout',
            customerId: 'c1',
            setAdyenOrder: jest.fn(),
            setAdyenAction: jest.fn(),
            setOrderNo: jest.fn(),
            navigate: jest.fn(),
            adyenConfig: undefined
        }

        const {result} = renderHook(() => usePaymentMethodsConfiguration(props))

        await result.current({
            beforeSubmit: [],
            afterSubmit: [],
            beforeAdditionalDetails: [],
            afterAdditionalDetails: [],
            onError: []
        })

        expect(getPaymentMethodsConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                additionalPaymentMethodsConfiguration: undefined,
                onError: expect.any(Array),
                afterSubmit: expect.any(Array),
                beforeSubmit: expect.any(Array)
            })
        )
    })

    it('should merge callback arrays from both params and adyenConfig', async () => {
        const paramBeforeSubmit = jest.fn()
        const configBeforeSubmit = jest.fn()

        const props = {
            adyenPaymentMethods: {paymentMethods: []},
            adyenOrder: null,
            orderNo: null,
            isCustomerRegistered: false,
            merchantDisplayName: '',
            token: 'token',
            site: {id: 'RefArch'},
            basket: {basketId: 'b1'},
            returnUrl: '/checkout',
            customerId: 'c1',
            setAdyenOrder: jest.fn(),
            setAdyenAction: jest.fn(),
            setOrderNo: jest.fn(),
            navigate: jest.fn(),
            adyenConfig: {
                beforeSubmit: [configBeforeSubmit]
            }
        }

        const {result} = renderHook(() => usePaymentMethodsConfiguration(props))

        await result.current({
            beforeSubmit: [paramBeforeSubmit],
            afterSubmit: [],
            beforeAdditionalDetails: [],
            afterAdditionalDetails: [],
            onError: []
        })

        const callArgs = getPaymentMethodsConfig.mock.calls[0][0]
        expect(callArgs.beforeSubmit).toContain(paramBeforeSubmit)
        expect(callArgs.beforeSubmit).toContain(configBeforeSubmit)
    })
})
