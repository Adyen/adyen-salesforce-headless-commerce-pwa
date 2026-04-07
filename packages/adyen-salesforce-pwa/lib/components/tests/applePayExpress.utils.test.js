/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import {
    getApplePaymentMethodConfig,
    getCustomerBillingDetails,
    getCustomerShippingDetails,
    getAppleButtonConfig,
    onErrorHandler
} from '../helpers/applePayExpress.utils'
import {AdyenPaymentsService} from '../../services/payments'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenTemporaryBasketService} from '../../services/temporary-basket'
import {PaymentCancelExpressService} from '../../services/payment-cancel-express'

jest.mock('../../services/payments')
jest.mock('../../services/shipping-address')
jest.mock('../../services/shipping-methods')
jest.mock('../../services/temporary-basket')
jest.mock('../../services/payment-cancel-express')
jest.mock('../../utils/executeCallbacks', () => ({
    executeCallbacks: jest.fn((cbs) => cbs),
    executeErrorCallbacks: jest.fn((cbs) => cbs)
}))

describe('getApplePaymentMethodConfig function', () => {
    it('returns null if paymentMethodsResponse is undefined', () => {
        expect(getApplePaymentMethodConfig()).toBeNull()
    })

    it('returns null if paymentMethodsResponse.paymentMethods is undefined', () => {
        expect(getApplePaymentMethodConfig({})).toBeNull()
    })

    it('returns null if no apple pay payment method is found', () => {
        const paymentMethodsResponse = {
            paymentMethods: [
                {
                    type: 'visa',
                    configuration: {}
                },
                {
                    type: 'mastercard',
                    configuration: {}
                }
            ]
        }
        expect(getApplePaymentMethodConfig(paymentMethodsResponse)).toBeNull()
    })

    it('returns configuration object if apple pay payment method is found', () => {
        const paymentMethodsResponse = {
            paymentMethods: [
                {
                    type: 'visa',
                    configuration: {}
                },
                {
                    type: 'applepay',
                    configuration: {merchantId: 'test'}
                }
            ]
        }
        expect(getApplePaymentMethodConfig(paymentMethodsResponse)).toEqual({merchantId: 'test'})
    })
})

describe('getCustomerShippingDetails function', () => {
    it('returns expected shipping details when all properties are provided', () => {
        const shippingContact = {
            locality: 'City',
            countryCode: 'US',
            addressLines: ['123 Main St', 'Apt 2'],
            postalCode: '12345',
            administrativeArea: 'State',
            givenName: 'John',
            familyName: 'Doe',
            emailAddress: 'john.doe@example.com',
            phoneNumber: '123-456-7890'
        }
        const expectedShippingDetails = {
            deliveryAddress: {
                city: 'City',
                country: 'US',
                houseNumberOrName: 'Apt 2',
                postalCode: '12345',
                stateOrProvince: 'State',
                street: '123 Main St'
            },
            profile: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '123-456-7890'
            }
        }
        expect(getCustomerShippingDetails(shippingContact)).toEqual(expectedShippingDetails)
    })

    it('returns expected shipping details when addressLines is not provided', () => {
        const shippingContact = {
            locality: 'City',
            countryCode: 'US',
            postalCode: '12345',
            administrativeArea: 'State',
            givenName: 'John',
            familyName: 'Doe',
            emailAddress: 'john.doe@example.com',
            phoneNumber: '123-456-7890'
        }
        const expectedShippingDetails = {
            deliveryAddress: {
                city: 'City',
                country: 'US',
                houseNumberOrName: '',
                postalCode: '12345',
                stateOrProvince: 'State',
                street: undefined
            },
            profile: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '123-456-7890'
            }
        }
        expect(getCustomerShippingDetails(shippingContact)).toEqual(expectedShippingDetails)
    })
})

describe('getCustomerBillingDetails function', () => {
    it('returns expected billing details when all properties are provided', () => {
        const billingContact = {
            locality: 'City',
            countryCode: 'US',
            addressLines: ['123 Main St', 'Apt 2'],
            postalCode: '12345',
            administrativeArea: 'State'
        }
        const expectedBillingDetails = {
            billingAddress: {
                city: 'City',
                country: 'US',
                houseNumberOrName: 'Apt 2',
                postalCode: '12345',
                stateOrProvince: 'State',
                street: '123 Main St'
            }
        }
        expect(getCustomerBillingDetails(billingContact)).toEqual(expectedBillingDetails)
    })

    it('returns expected billing details when addressLines is not provided', () => {
        const billingContact = {
            locality: 'City',
            countryCode: 'US',
            postalCode: '12345',
            administrativeArea: 'State'
        }
        const expectedBillingDetails = {
            billingAddress: {
                city: 'City',
                country: 'US',
                houseNumberOrName: '',
                postalCode: '12345',
                stateOrProvince: 'State',
                street: undefined
            }
        }
        expect(getCustomerBillingDetails(billingContact)).toEqual(expectedBillingDetails)
    })
})

describe('getAppleButtonConfig', () => {
    let mockSubmitPayment
    let mockUpdateShippingAddress
    let mockUpdateShippingMethod
    let mockCreateTemporaryBasket
    let defaultProps

    beforeEach(() => {
        jest.clearAllMocks()

        mockSubmitPayment = jest.fn()
        mockUpdateShippingAddress = jest.fn()
        mockUpdateShippingMethod = jest.fn()
        mockCreateTemporaryBasket = jest.fn()

        AdyenPaymentsService.mockImplementation(() => ({
            submitPayment: mockSubmitPayment
        }))
        AdyenShippingAddressService.mockImplementation(() => ({
            updateShippingAddress: mockUpdateShippingAddress
        }))
        AdyenShippingMethodsService.mockImplementation(() => ({
            updateShippingMethod: mockUpdateShippingMethod
        }))
        AdyenTemporaryBasketService.mockImplementation(() => ({
            createTemporaryBasket: mockCreateTemporaryBasket
        }))

        defaultProps = {
            authToken: 'test-token',
            customerId: 'customer-123',
            site: {id: 'RefArch'},
            basket: {basketId: 'basket-456', orderTotal: 100, currency: 'USD'},
            navigate: jest.fn(),
            applePayConfig: {merchantName: 'TestMerchant', merchantId: 'merchant.test'},
            shippingMethods: [
                {name: 'Standard', description: 'Standard Shipping', id: 'std', price: 5.99}
            ],
            fetchShippingMethods: jest.fn(),
            onError: [],
            isExpressPdp: false,
            merchantDisplayName: 'Test Store',
            locale: {id: 'en-US'}
        }
    })

    it('should return a button config with expected properties', () => {
        const config = getAppleButtonConfig(defaultProps)

        expect(config.showPayButton).toBe(true)
        expect(config.isExpress).toBe(true)
        expect(config.configuration).toBe(defaultProps.applePayConfig)
        expect(config.amount).toEqual({value: 10000, currency: 'USD'})
        expect(config.requiredShippingContactFields).toEqual([
            'postalAddress',
            'name',
            'phoneticName',
            'email',
            'phone'
        ])
        expect(config.requiredBillingContactFields).toEqual(['postalAddress'])
        expect(config.shippingMethods).toEqual([
            {label: 'Standard', detail: 'Standard Shipping', identifier: 'std', amount: '5.99'}
        ])
    })

    describe('onSubmit', () => {
        const authorizeFirst = (config) => {
            config.onAuthorized(
                {
                    authorizedEvent: {
                        payment: {
                            shippingContact: {
                                locality: 'City',
                                countryCode: 'US',
                                addressLines: ['123 St', 'Apt 1'],
                                postalCode: '12345',
                                administrativeArea: 'CA',
                                givenName: 'John',
                                familyName: 'Doe',
                                emailAddress: 'john@test.com',
                                phoneNumber: '555-1234'
                            },
                            billingContact: {
                                locality: 'City',
                                countryCode: 'US',
                                addressLines: ['123 St', 'Apt 1'],
                                postalCode: '12345',
                                administrativeArea: 'CA'
                            }
                        }
                    }
                },
                {resolve: jest.fn(), reject: jest.fn()}
            )
        }

        it('should submit payment and navigate on success', async () => {
            mockSubmitPayment.mockResolvedValue({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'order-789'
            })
            const config = getAppleButtonConfig(defaultProps)
            authorizeFirst(config)
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            const state = {data: {origin: 'https://test.com'}}

            await config.onSubmit(state, {}, actions)

            expect(mockSubmitPayment).toHaveBeenCalled()
            expect(actions.resolve).toHaveBeenCalled()
            expect(defaultProps.navigate).toHaveBeenCalledWith('/checkout/confirmation/order-789')
        })

        it('should reject when payment is not successful', async () => {
            mockSubmitPayment.mockResolvedValue({
                isFinal: true,
                isSuccessful: false
            })
            const config = getAppleButtonConfig(defaultProps)
            authorizeFirst(config)
            const actions = {resolve: jest.fn(), reject: jest.fn()}

            await config.onSubmit({data: {}}, {}, actions)

            expect(actions.reject).toHaveBeenCalled()
            expect(actions.resolve).not.toHaveBeenCalled()
        })

        it('should use isExpressPdp and temporaryBasket in onSubmit when PDP express', async () => {
            defaultProps.isExpressPdp = true
            defaultProps.product = {id: 'prod-1', quantity: 1}
            mockCreateTemporaryBasket.mockResolvedValue({
                basketId: 'temp-basket-1',
                orderTotal: 50
            })
            mockSubmitPayment.mockResolvedValue({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'order-pdp'
            })

            const config = getAppleButtonConfig(defaultProps)
            // First click to create temp basket
            await config.onClick(jest.fn(), jest.fn())
            // Authorize
            authorizeFirst(config)
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            await config.onSubmit({data: {origin: 'https://test.com'}}, {}, actions)

            expect(mockSubmitPayment).toHaveBeenCalled()
            expect(actions.resolve).toHaveBeenCalled()
        })

        it('should use merchantName from applePayConfig when merchantDisplayName is empty', async () => {
            defaultProps.merchantDisplayName = ''
            mockSubmitPayment.mockResolvedValue({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'order-789'
            })
            const config = getAppleButtonConfig(defaultProps)
            authorizeFirst(config)
            const actions = {resolve: jest.fn(), reject: jest.fn()}

            await config.onSubmit({data: {origin: 'https://test.com'}}, {}, actions)

            expect(actions.resolve).toHaveBeenCalledWith(
                expect.objectContaining({
                    newTotal: expect.objectContaining({
                        label: 'TestMerchant'
                    })
                })
            )
        })

        it('should call onError callbacks and reject when submitPayment throws', async () => {
            const mockError = new Error('Payment failed')
            mockSubmitPayment.mockRejectedValue(mockError)
            const errorCb = jest.fn()
            defaultProps.onError = [errorCb]

            const config = getAppleButtonConfig(defaultProps)
            authorizeFirst(config)
            const actions = {resolve: jest.fn(), reject: jest.fn()}

            await config.onSubmit({data: {}}, {}, actions)

            expect(errorCb).toHaveBeenCalledWith(mockError)
            expect(actions.reject).toHaveBeenCalledWith(mockError)
        })
    })

    describe('onAuthorized', () => {
        it('should resolve on valid authorization data', () => {
            const config = getAppleButtonConfig(defaultProps)
            const actions = {resolve: jest.fn(), reject: jest.fn()}
            const data = {
                authorizedEvent: {
                    payment: {
                        shippingContact: {givenName: 'John'},
                        billingContact: {locality: 'City'}
                    }
                }
            }

            config.onAuthorized(data, actions)

            expect(actions.resolve).toHaveBeenCalled()
        })

        it('should reject on error during authorization', () => {
            const errorCb = jest.fn()
            defaultProps.onError = [errorCb]
            const config = getAppleButtonConfig(defaultProps)
            const actions = {resolve: jest.fn(), reject: jest.fn()}

            config.onAuthorized({authorizedEvent: null}, actions)

            expect(actions.reject).toHaveBeenCalled()
        })
    })

    describe('onShippingContactSelected', () => {
        it('should update shipping address and resolve with shipping methods', async () => {
            mockUpdateShippingAddress.mockResolvedValue({})
            defaultProps.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: 'std',
                applicableShippingMethods: [
                    {name: 'Standard', description: 'Std', id: 'std', price: 5.99}
                ]
            })
            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 105.99,
                currency: 'USD'
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingContactSelected(resolve, reject, {
                shippingContact: {
                    locality: 'City',
                    countryCode: 'US',
                    postalCode: '12345',
                    administrativeArea: 'CA'
                }
            })

            expect(mockUpdateShippingAddress).toHaveBeenCalled()
            expect(mockUpdateShippingMethod).toHaveBeenCalledWith('std')
            expect(resolve).toHaveBeenCalledWith(
                expect.objectContaining({
                    newShippingMethods: expect.any(Array),
                    newTotal: expect.objectContaining({
                        type: 'final',
                        label: 'Test Store'
                    })
                })
            )
        })

        it('should reject when no applicable shipping methods', async () => {
            mockUpdateShippingAddress.mockResolvedValue({})
            defaultProps.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: null,
                applicableShippingMethods: []
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingContactSelected(resolve, reject, {
                shippingContact: {locality: 'City', countryCode: 'US'}
            })

            expect(reject).toHaveBeenCalled()
            expect(resolve).not.toHaveBeenCalled()
        })

        it('should use isExpressPdp temporaryBasket in onShippingContactSelected', async () => {
            defaultProps.isExpressPdp = true
            defaultProps.product = {id: 'prod-1', quantity: 1}
            mockCreateTemporaryBasket.mockResolvedValue({
                basketId: 'temp-basket-1',
                orderTotal: 50
            })

            const config = getAppleButtonConfig(defaultProps)
            // Create temp basket first
            await config.onClick(jest.fn(), jest.fn())

            mockUpdateShippingAddress.mockResolvedValue({})
            defaultProps.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: 'std',
                applicableShippingMethods: [
                    {name: 'Standard', description: 'Std', id: 'std', price: 5.99}
                ]
            })
            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 55.99,
                currency: 'USD'
            })

            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingContactSelected(resolve, reject, {
                shippingContact: {
                    locality: 'City',
                    countryCode: 'US',
                    postalCode: '12345',
                    administrativeArea: 'CA'
                }
            })

            expect(resolve).toHaveBeenCalled()
        })

        it('should sort shipping methods with default first and handle b match', async () => {
            mockUpdateShippingAddress.mockResolvedValue({})
            defaultProps.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: 'exp',
                applicableShippingMethods: [
                    {name: 'Standard', description: 'Std', id: 'std', price: 5.99},
                    {name: 'Express', description: 'Fast', id: 'exp', price: 12.99},
                    {name: 'Overnight', description: 'Next day', id: 'ovn', price: 25.99}
                ]
            })
            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 112.99,
                currency: 'USD'
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingContactSelected(resolve, reject, {
                shippingContact: {locality: 'City', countryCode: 'US'}
            })

            expect(resolve).toHaveBeenCalled()
            const resolvedArg = resolve.mock.calls[0][0]
            // Default method 'exp' should be sorted first
            expect(resolvedArg.newShippingMethods[0].identifier).toBe('exp')
        })

        it('should use merchantName fallback in shipping contact resolved total', async () => {
            defaultProps.merchantDisplayName = ''
            mockUpdateShippingAddress.mockResolvedValue({})
            defaultProps.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: 'std',
                applicableShippingMethods: [
                    {name: 'Standard', description: 'Std', id: 'std', price: 5.99}
                ]
            })
            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 105.99,
                currency: 'USD'
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()

            await config.onShippingContactSelected(resolve, jest.fn(), {
                shippingContact: {locality: 'City', countryCode: 'US'}
            })

            expect(resolve).toHaveBeenCalledWith(
                expect.objectContaining({
                    newTotal: expect.objectContaining({
                        label: 'TestMerchant'
                    })
                })
            )
        })

        it('should use first shipping method when no default', async () => {
            mockUpdateShippingAddress.mockResolvedValue({})
            defaultProps.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: null,
                applicableShippingMethods: [
                    {name: 'Express', description: 'Fast', id: 'exp', price: 12.99}
                ]
            })
            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 112.99,
                currency: 'USD'
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingContactSelected(resolve, reject, {
                shippingContact: {locality: 'City', countryCode: 'US'}
            })

            expect(mockUpdateShippingMethod).toHaveBeenCalledWith('exp')
            expect(resolve).toHaveBeenCalled()
        })

        it('should call onError and reject on exception', async () => {
            const mockError = new Error('Address update failed')
            mockUpdateShippingAddress.mockRejectedValue(mockError)
            const errorCb = jest.fn()
            defaultProps.onError = [errorCb]

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingContactSelected(resolve, reject, {
                shippingContact: {locality: 'City'}
            })

            expect(errorCb).toHaveBeenCalledWith(mockError)
            expect(reject).toHaveBeenCalledWith(mockError)
        })
    })

    describe('onShippingMethodSelected', () => {
        it('should update shipping method and resolve on success', async () => {
            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 110,
                currency: 'USD'
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingMethodSelected(resolve, reject, {
                shippingMethod: {identifier: 'express-id'}
            })

            expect(mockUpdateShippingMethod).toHaveBeenCalledWith('express-id')
            expect(resolve).toHaveBeenCalledWith(
                expect.objectContaining({
                    newTotal: expect.objectContaining({
                        type: 'final',
                        label: 'Test Store'
                    })
                })
            )
        })

        it('should use isExpressPdp temporaryBasket in onShippingMethodSelected', async () => {
            defaultProps.isExpressPdp = true
            defaultProps.product = {id: 'prod-1', quantity: 1}
            mockCreateTemporaryBasket.mockResolvedValue({
                basketId: 'temp-basket-1',
                orderTotal: 50
            })

            const config = getAppleButtonConfig(defaultProps)
            // Create temp basket first
            await config.onClick(jest.fn(), jest.fn())

            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 62,
                currency: 'USD'
            })

            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingMethodSelected(resolve, reject, {
                shippingMethod: {identifier: 'express-id'}
            })

            expect(mockUpdateShippingMethod).toHaveBeenCalledWith('express-id')
            expect(resolve).toHaveBeenCalled()
        })

        it('should use merchantName fallback in shipping method selected total', async () => {
            defaultProps.merchantDisplayName = ''
            mockUpdateShippingMethod.mockResolvedValue({
                orderTotal: 110,
                currency: 'USD'
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()

            await config.onShippingMethodSelected(resolve, jest.fn(), {
                shippingMethod: {identifier: 'express-id'}
            })

            expect(resolve).toHaveBeenCalledWith(
                expect.objectContaining({
                    newTotal: expect.objectContaining({
                        label: 'TestMerchant'
                    })
                })
            )
        })

        it('should reject when updateShippingMethod returns error', async () => {
            mockUpdateShippingMethod.mockResolvedValue({error: true})

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingMethodSelected(resolve, reject, {
                shippingMethod: {identifier: 'bad-id'}
            })

            expect(reject).toHaveBeenCalled()
            expect(resolve).not.toHaveBeenCalled()
        })

        it('should call onError and reject on exception', async () => {
            const mockError = new Error('Shipping method update failed')
            mockUpdateShippingMethod.mockRejectedValue(mockError)
            const errorCb = jest.fn()
            defaultProps.onError = [errorCb]

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onShippingMethodSelected(resolve, reject, {
                shippingMethod: {identifier: 'id'}
            })

            expect(errorCb).toHaveBeenCalledWith(mockError)
            expect(reject).toHaveBeenCalledWith(mockError)
        })
    })

    describe('onClick', () => {
        it('should resolve immediately when not PDP express', async () => {
            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onClick(resolve, reject)

            expect(resolve).toHaveBeenCalled()
            expect(mockCreateTemporaryBasket).not.toHaveBeenCalled()
        })

        it('should create temporary basket and resolve for PDP express', async () => {
            defaultProps.isExpressPdp = true
            defaultProps.product = {id: 'prod-1', quantity: 1}
            mockCreateTemporaryBasket.mockResolvedValue({
                basketId: 'temp-basket-1',
                orderTotal: 50
            })

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onClick(resolve, reject)

            expect(mockCreateTemporaryBasket).toHaveBeenCalledWith({id: 'prod-1', quantity: 1})
            expect(resolve).toHaveBeenCalledWith(
                expect.objectContaining({
                    newTotal: expect.objectContaining({
                        type: 'final',
                        amount: 50
                    })
                })
            )
        })

        it('should reject if temporary basket has no basketId', async () => {
            defaultProps.isExpressPdp = true
            defaultProps.product = {id: 'prod-1'}
            mockCreateTemporaryBasket.mockResolvedValue({})

            const config = getAppleButtonConfig(defaultProps)
            const resolve = jest.fn()
            const reject = jest.fn()

            await config.onClick(resolve, reject)

            expect(reject).toHaveBeenCalled()
            expect(resolve).not.toHaveBeenCalled()
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

    it('should cancel express payment and navigate on success', async () => {
        const mockPaymentCancelExpress = jest.fn().mockResolvedValue({})
        PaymentCancelExpressService.mockImplementation(() => ({
            paymentCancelExpress: mockPaymentCancelExpress
        }))

        const props = {
            token: 'test-token',
            customerId: 'customer-123',
            site: {id: 'RefArch'},
            navigate: jest.fn(),
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
        expect(props.navigate).toHaveBeenCalledWith('/checkout?error=true')
        expect(result).toEqual({cancelled: true})
    })

    it('should handle cancellation errors gracefully', async () => {
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

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error during express payment cancellation:',
            cancelError
        )
        expect(result).toEqual({cancelled: false, error: 'Cancel failed'})
    })

    it('should skip cancel call when error already has newBasketId', async () => {
        const mockPaymentCancelExpress = jest.fn()
        PaymentCancelExpressService.mockImplementation(() => ({
            paymentCancelExpress: mockPaymentCancelExpress
        }))

        const props = {
            token: 'test-token',
            customerId: 'customer-123',
            site: {id: 'RefArch'},
            navigate: jest.fn(),
            getBasket: () => ({basketId: 'basket-456'})
        }

        const error = new Error('Payment error')
        error.newBasketId = 'already-created-basket'

        const result = await onErrorHandler(error, {}, props)

        expect(mockPaymentCancelExpress).not.toHaveBeenCalled()
        expect(props.navigate).toHaveBeenCalledWith('/checkout?error=true')
        expect(result).toEqual({cancelled: true})
    })
})
