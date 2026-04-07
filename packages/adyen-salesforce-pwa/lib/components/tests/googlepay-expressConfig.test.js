/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import {
    getGooglePayExpressConfig,
    getGooglePayDeliveryAddress,
    getGooglePayShopperDetails,
    onErrorHandler
} from '../googlepay/expressConfig'
import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenTemporaryBasketService} from '../../services/temporary-basket'
import {AdyenOrderNumberService} from '../../services/order-number'
import {PaymentCancelExpressService} from '../../services/payment-cancel-express'

jest.mock('../../services/payments')
jest.mock('../../services/payments-details')
jest.mock('../../services/shipping-address')
jest.mock('../../services/shipping-methods')
jest.mock('../../services/temporary-basket')
jest.mock('../../services/order-number')
jest.mock('../../services/payment-cancel-express')
jest.mock('../../utils/executeCallbacks', () => ({
    executeCallbacks: jest.fn((cbs) => cbs),
    executeErrorCallbacks: jest.fn((cbs) => cbs)
}))
jest.mock('../../utils/parsers.mjs', () => ({
    getCurrencyValueForApi: jest.fn((value) => value * 100)
}))

const defaultProps = {
    token: 'test-token',
    customerId: 'customer-123',
    site: {id: 'RefArch'},
    basket: {
        basketId: 'basket-456',
        orderTotal: 100,
        currency: 'USD',
        customerInfo: {customerId: 'customer-123'}
    },
    locale: {id: 'en-US'},
    navigate: jest.fn(),
    fetchShippingMethods: jest.fn(),
    onError: []
}

describe('getGooglePayDeliveryAddress', () => {
    it('returns null when address is null', () => {
        expect(getGooglePayDeliveryAddress(null)).toBeNull()
    })

    it('returns null when address is undefined', () => {
        expect(getGooglePayDeliveryAddress(undefined)).toBeNull()
    })

    it('converts Google Pay address to Adyen/SFCC format', () => {
        const result = getGooglePayDeliveryAddress({
            countryCode: 'US',
            postalCode: '10001',
            locality: 'New York',
            administrativeArea: 'NY',
            address1: '123 Main St',
            address2: 'Apt 4B'
        })
        expect(result).toEqual({
            city: 'New York',
            country: 'US',
            postalCode: '10001',
            stateOrProvince: 'NY',
            street: '123 Main St',
            houseNumberOrName: 'Apt 4B'
        })
    })

    it('handles missing optional fields with empty strings', () => {
        const result = getGooglePayDeliveryAddress({countryCode: 'US'})
        expect(result).toEqual({
            city: '',
            country: 'US',
            postalCode: '',
            stateOrProvince: '',
            street: '',
            houseNumberOrName: ''
        })
    })
})

describe('getGooglePayShopperDetails', () => {
    it('returns shopper details from Google Pay payment data', () => {
        const result = getGooglePayShopperDetails({
            email: 'shopper@example.com',
            shippingAddress: {
                name: 'John Doe',
                phoneNumber: '+1234567890',
                countryCode: 'US',
                postalCode: '10001',
                locality: 'New York',
                administrativeArea: 'NY',
                address1: '123 Main St'
            },
            paymentMethodData: {
                info: {
                    billingAddress: {
                        countryCode: 'US',
                        postalCode: '10002',
                        locality: 'New York',
                        administrativeArea: 'NY',
                        address1: '456 Billing Ave'
                    }
                }
            }
        })
        expect(result.profile.email).toBe('shopper@example.com')
        expect(result.profile.firstName).toBe('John')
        expect(result.profile.lastName).toBe('Doe')
        expect(result.profile.phone).toBe('+1234567890')
        expect(result.deliveryAddress.city).toBe('New York')
        expect(result.billingAddress.street).toBe('456 Billing Ave')
    })

    it('handles missing data gracefully', () => {
        const result = getGooglePayShopperDetails({})
        expect(result.profile.email).toBe('')
        expect(result.deliveryAddress).toBeNull()
        expect(result.billingAddress).toBeNull()
    })
})

describe('getGooglePayExpressConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns config with expected base properties', () => {
        const config = getGooglePayExpressConfig(defaultProps)
        expect(config.showPayButton).toBe(true)
        expect(config.isExpress).toBe(true)
        expect(config.callbackIntents).toEqual(['SHIPPING_ADDRESS', 'SHIPPING_OPTION'])
        expect(config.shippingAddressRequired).toBe(true)
        expect(config.shippingOptionRequired).toBe(true)
        expect(config.emailRequired).toBe(true)
        expect(config.billingAddressRequired).toBe(true)
    })

    it('sets the amount from the basket', () => {
        const config = getGooglePayExpressConfig(defaultProps)
        expect(config.amount).toEqual({value: 10000, currency: 'USD'})
    })

    it('merges additional configuration', () => {
        const config = getGooglePayExpressConfig({
            ...defaultProps,
            configuration: {buttonColor: 'white'}
        })
        expect(config.buttonColor).toBe('white')
    })

    describe('onAuthorized', () => {
        it('resolves on valid payment data', () => {
            const config = getGooglePayExpressConfig(defaultProps)
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            config.onAuthorized({email: 'test@test.com'}, actions)
            expect(actions.resolve).toHaveBeenCalled()
        })

        it('rejects and calls onError on exception', () => {
            const errorCb = jest.fn()
            const config = getGooglePayExpressConfig({...defaultProps, onError: [errorCb]})
            const actions = {
                resolve: jest.fn(() => {
                    throw new Error('resolve failed')
                }),
                reject: jest.fn()
            }
            config.onAuthorized({}, actions)
            expect(actions.reject).toHaveBeenCalled()
            expect(errorCb).toHaveBeenCalled()
        })
    })

    describe('onClick', () => {
        it('resolves immediately for cart type', async () => {
            const config = getGooglePayExpressConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()
            await config.onClick(resolve, reject)
            expect(resolve).toHaveBeenCalled()
            expect(AdyenTemporaryBasketService).not.toHaveBeenCalled()
        })

        it('creates temporary basket for PDP type and resolves', async () => {
            const mockCreateTemporaryBasket = jest.fn().mockResolvedValue({
                basketId: 'temp-basket-1',
                orderTotal: 50,
                currency: 'USD'
            })
            AdyenTemporaryBasketService.mockImplementation(() => ({
                createTemporaryBasket: mockCreateTemporaryBasket
            }))

            const config = getGooglePayExpressConfig({
                ...defaultProps,
                type: 'pdp',
                product: {id: 'prod-1', quantity: 1}
            })
            const resolve = jest.fn()
            const reject = jest.fn()
            await config.onClick(resolve, reject)

            expect(AdyenTemporaryBasketService).toHaveBeenCalledWith('test-token', 'customer-123', {
                id: 'RefArch'
            })
            expect(mockCreateTemporaryBasket).toHaveBeenCalledWith({id: 'prod-1', quantity: 1})
            expect(resolve).toHaveBeenCalled()
        })

        it('rejects if temporary basket creation fails', async () => {
            AdyenTemporaryBasketService.mockImplementation(() => ({
                createTemporaryBasket: jest.fn().mockResolvedValue({})
            }))
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                type: 'pdp',
                product: {id: 'prod-1'}
            })
            const resolve = jest.fn()
            const reject = jest.fn()
            await config.onClick(resolve, reject)
            expect(reject).toHaveBeenCalled()
        })

        it('rejects on service error', async () => {
            const errorCb = jest.fn()
            AdyenTemporaryBasketService.mockImplementation(() => ({
                createTemporaryBasket: jest.fn().mockRejectedValue(new Error('service error'))
            }))
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                type: 'pdp',
                product: {id: 'prod-1'},
                onError: [errorCb]
            })
            const resolve = jest.fn()
            const reject = jest.fn()
            await config.onClick(resolve, reject)
            expect(reject).toHaveBeenCalled()
            expect(errorCb).toHaveBeenCalled()
        })
    })

    describe('onSubmit', () => {
        let mockSubmitPayment, mockFetchOrderNumber

        beforeEach(() => {
            mockSubmitPayment = jest.fn()
            mockFetchOrderNumber = jest.fn().mockResolvedValue({orderNo: 'ORDER-001'})
            AdyenPaymentsService.mockImplementation(() => ({submitPayment: mockSubmitPayment}))
            AdyenOrderNumberService.mockImplementation(() => ({
                fetchOrderNumber: mockFetchOrderNumber
            }))
        })

        it('navigates to confirmation on successful payment', async () => {
            mockSubmitPayment.mockResolvedValue({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'ORDER-001'
            })
            const navigate = jest.fn()
            const config = getGooglePayExpressConfig({...defaultProps, navigate})
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onSubmit({data: {}}, {handleAction: jest.fn()}, actions)

            expect(navigate).toHaveBeenCalledWith('/checkout/confirmation/ORDER-001')
            expect(actions.resolve).toHaveBeenCalled()
        })

        it('calls handleAction when 3DS action is present', async () => {
            const mockAction = {type: 'threeDS2'}
            mockSubmitPayment.mockResolvedValue({action: mockAction})
            const component = {handleAction: jest.fn()}
            const config = getGooglePayExpressConfig(defaultProps)
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onSubmit({data: {}}, component, actions)

            expect(component.handleAction).toHaveBeenCalledWith(mockAction)
        })

        it('rejects when payment is not successful', async () => {
            mockSubmitPayment.mockResolvedValue({isFinal: true, isSuccessful: false})
            const config = getGooglePayExpressConfig(defaultProps)
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onSubmit({data: {}}, {handleAction: jest.fn()}, actions)

            expect(actions.reject).toHaveBeenCalled()
        })

        it('rejects when order number generation fails', async () => {
            mockFetchOrderNumber.mockResolvedValue({orderNo: null})
            const errorCb = jest.fn()
            const config = getGooglePayExpressConfig({...defaultProps, onError: [errorCb]})
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onSubmit({data: {}}, {handleAction: jest.fn()}, actions)

            expect(actions.reject).toHaveBeenCalled()
            expect(errorCb).toHaveBeenCalled()
        })

        it('uses shopper details from onAuthorized', async () => {
            mockSubmitPayment.mockResolvedValue({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'ORDER-001'
            })
            const config = getGooglePayExpressConfig(defaultProps)
            config.onAuthorized(
                {
                    email: 'test@test.com',
                    shippingAddress: {
                        name: 'John Doe',
                        countryCode: 'US',
                        postalCode: '10001',
                        locality: 'New York',
                        administrativeArea: 'NY',
                        address1: '123 Main St'
                    }
                },
                {resolve: jest.fn(), reject: jest.fn()}
            )
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onSubmit({data: {}}, {handleAction: jest.fn()}, actions)

            expect(mockSubmitPayment).toHaveBeenCalledWith(
                expect.objectContaining({
                    deliveryAddress: expect.objectContaining({city: 'New York'}),
                    profile: expect.objectContaining({email: 'test@test.com'})
                }),
                defaultProps.locale
            )
        })
    })

    describe('onAdditionalDetails', () => {
        it('navigates to confirmation on successful payment details', async () => {
            const mockSubmitDetails = jest.fn().mockResolvedValue({
                isSuccessful: true,
                merchantReference: 'ORDER-001'
            })
            AdyenPaymentsDetailsService.mockImplementation(() => ({
                submitPaymentsDetails: mockSubmitDetails
            }))
            const navigate = jest.fn()
            const config = getGooglePayExpressConfig({...defaultProps, navigate})
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onAdditionalDetails({data: {}}, {}, actions)

            expect(navigate).toHaveBeenCalledWith('/checkout/confirmation/ORDER-001')
            expect(actions.resolve).toHaveBeenCalled()
        })

        it('resolves without navigation when not successful', async () => {
            AdyenPaymentsDetailsService.mockImplementation(() => ({
                submitPaymentsDetails: jest.fn().mockResolvedValue({isSuccessful: false})
            }))
            const navigate = jest.fn()
            const config = getGooglePayExpressConfig({...defaultProps, navigate})
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onAdditionalDetails({data: {}}, {}, actions)

            expect(navigate).not.toHaveBeenCalled()
            expect(actions.resolve).toHaveBeenCalled()
        })

        it('rejects on error', async () => {
            AdyenPaymentsDetailsService.mockImplementation(() => ({
                submitPaymentsDetails: jest.fn().mockRejectedValue(new Error('details failed'))
            }))
            const errorCb = jest.fn()
            const config = getGooglePayExpressConfig({...defaultProps, onError: [errorCb]})
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onAdditionalDetails({data: {}}, {}, actions)

            expect(errorCb).toHaveBeenCalled()
            expect(actions.reject).toHaveBeenCalled()
        })
    })

    describe('paymentDataCallbacks.onPaymentDataChanged', () => {
        let mockUpdateShippingAddress, mockUpdateShippingMethod, mockFetchShippingMethods

        beforeEach(() => {
            mockUpdateShippingAddress = jest.fn().mockResolvedValue({})
            mockUpdateShippingMethod = jest.fn().mockResolvedValue({
                orderTotal: 110,
                currency: 'USD'
            })
            mockFetchShippingMethods = jest.fn().mockResolvedValue({
                defaultShippingMethodId: 'standard',
                applicableShippingMethods: [
                    {id: 'standard', name: 'Standard Shipping', description: 'Free'},
                    {id: 'express', name: 'Express Shipping', description: 'Fast'}
                ]
            })
            AdyenShippingAddressService.mockImplementation(() => ({
                updateShippingAddress: mockUpdateShippingAddress
            }))
            AdyenShippingMethodsService.mockImplementation(() => ({
                updateShippingMethod: mockUpdateShippingMethod
            }))
        })

        it('handles INITIALIZE trigger by updating address and returning shipping options', async () => {
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                fetchShippingMethods: mockFetchShippingMethods
            })
            const result = await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'INITIALIZE',
                shippingAddress: {
                    countryCode: 'US',
                    postalCode: '10001',
                    locality: 'New York',
                    administrativeArea: 'NY'
                }
            })

            expect(mockUpdateShippingAddress).toHaveBeenCalled()
            expect(mockFetchShippingMethods).toHaveBeenCalled()
            expect(mockUpdateShippingMethod).toHaveBeenCalledWith('standard')
            expect(result.newShippingOptionParameters).toBeDefined()
            expect(result.newShippingOptionParameters.defaultSelectedOptionId).toBe('standard')
            expect(result.newShippingOptionParameters.shippingOptions[0].id).toBe('standard')
            expect(result.newTransactionInfo).toBeDefined()
        })

        it('handles SHIPPING_ADDRESS trigger', async () => {
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                fetchShippingMethods: mockFetchShippingMethods
            })
            const result = await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'SHIPPING_ADDRESS',
                shippingAddress: {countryCode: 'US', postalCode: '10001'}
            })

            expect(mockUpdateShippingAddress).toHaveBeenCalled()
            expect(result.newShippingOptionParameters).toBeDefined()
        })

        it('handles SHIPPING_OPTION trigger', async () => {
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                fetchShippingMethods: mockFetchShippingMethods
            })
            const result = await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'SHIPPING_OPTION',
                shippingOptionData: {id: 'express'}
            })

            expect(mockUpdateShippingMethod).toHaveBeenCalledWith('express')
            expect(result.newTransactionInfo).toBeDefined()
            expect(result.newTransactionInfo.totalPrice).toBe('110')
        })

        it('returns SHIPPING_ADDRESS_UNSERVICEABLE error when no shipping address on INITIALIZE', async () => {
            const config = getGooglePayExpressConfig(defaultProps)
            const result = await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'INITIALIZE',
                shippingAddress: null
            })
            expect(result.error.reason).toBe('SHIPPING_ADDRESS_UNSERVICEABLE')
        })

        it('returns error when no applicable shipping methods', async () => {
            mockFetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: null,
                applicableShippingMethods: []
            })
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                fetchShippingMethods: mockFetchShippingMethods
            })
            const result = await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'SHIPPING_ADDRESS',
                shippingAddress: {countryCode: 'US'}
            })

            expect(result.error.reason).toBe('SHIPPING_ADDRESS_UNSERVICEABLE')
        })

        it('returns error and calls onError on exception', async () => {
            const errorCb = jest.fn()
            mockUpdateShippingAddress.mockRejectedValue(new Error('address update failed'))
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                fetchShippingMethods: mockFetchShippingMethods,
                onError: [errorCb]
            })
            const result = await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'SHIPPING_ADDRESS',
                shippingAddress: {countryCode: 'US'}
            })

            expect(result.error).toBeDefined()
            expect(errorCb).toHaveBeenCalled()
        })

        it('returns SHIPPING_OPTION_INVALID when shippingOptionData has no id', async () => {
            const config = getGooglePayExpressConfig(defaultProps)
            const result = await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'SHIPPING_OPTION',
                shippingOptionData: null
            })
            expect(result.error.reason).toBe('SHIPPING_OPTION_INVALID')
        })

        it('uses first shipping method when no default is set', async () => {
            mockFetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: null,
                applicableShippingMethods: [
                    {id: 'express', name: 'Express', description: 'Fast'},
                    {id: 'standard', name: 'Standard', description: 'Slow'}
                ]
            })
            const config = getGooglePayExpressConfig({
                ...defaultProps,
                fetchShippingMethods: mockFetchShippingMethods
            })
            await config.paymentDataCallbacks.onPaymentDataChanged({
                callbackTrigger: 'INITIALIZE',
                shippingAddress: {countryCode: 'US'}
            })

            expect(mockUpdateShippingMethod).toHaveBeenCalledWith('express')
        })
    })
})

describe('onErrorHandler', () => {
    let consoleErrorSpy

    beforeEach(() => {
        jest.clearAllMocks()
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('cancels express payment and navigates on success', async () => {
        const mockPaymentCancelExpress = jest.fn().mockResolvedValue({})
        PaymentCancelExpressService.mockImplementation(() => ({
            paymentCancelExpress: mockPaymentCancelExpress
        }))
        const navigate = jest.fn()
        const props = {
            token: 'test-token',
            customerId: 'customer-123',
            site: {id: 'RefArch'},
            navigate,
            getBasket: () => ({basketId: 'basket-456'})
        }
        const result = await onErrorHandler(new Error('Payment error'), {}, props)

        expect(PaymentCancelExpressService).toHaveBeenCalledWith(
            'test-token',
            'customer-123',
            'basket-456',
            {id: 'RefArch'}
        )
        expect(mockPaymentCancelExpress).toHaveBeenCalled()
        expect(navigate).toHaveBeenCalledWith('/checkout?error=true')
        expect(result).toEqual({cancelled: true})
    })

    it('handles cancellation errors gracefully', async () => {
        const cancelError = new Error('Cancel failed')
        PaymentCancelExpressService.mockImplementation(() => ({
            paymentCancelExpress: jest.fn().mockRejectedValue(cancelError)
        }))
        const props = {
            token: 'test-token',
            customerId: 'customer-123',
            site: {id: 'RefArch'},
            navigate: jest.fn(),
            getBasket: () => ({basketId: 'basket-456'})
        }
        const result = await onErrorHandler(new Error('Payment error'), {}, props)

        expect(consoleErrorSpy).toHaveBeenCalled()
        expect(result).toEqual({cancelled: false, error: 'Cancel failed'})
    })

    it('skips cancel call when error already has newBasketId', async () => {
        const mockPaymentCancelExpress = jest.fn()
        PaymentCancelExpressService.mockImplementation(() => ({
            paymentCancelExpress: mockPaymentCancelExpress
        }))
        const navigate = jest.fn()
        const props = {
            token: 'test-token',
            customerId: 'customer-123',
            site: {id: 'RefArch'},
            navigate,
            getBasket: () => ({basketId: 'basket-456'})
        }
        const error = new Error('Payment error')
        error.newBasketId = 'already-created-basket'
        const result = await onErrorHandler(error, {}, props)

        expect(mockPaymentCancelExpress).not.toHaveBeenCalled()
        expect(navigate).toHaveBeenCalledWith('/checkout?error=true')
        expect(result).toEqual({cancelled: true})
    })
})
