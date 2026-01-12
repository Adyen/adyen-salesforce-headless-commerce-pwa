import {
    paypalExpressConfig,
    onPaymentsSuccess,
    onPaymentsDetailsSuccess,
    onAuthorized,
    onAuthorizedSuccess,
    onShippingAddressChange,
    onShippingOptionsChange,
    createTemporaryBasketCallback
} from '../paypal/expressConfig'
import {baseConfig, onSubmit, onAdditionalDetails} from '../helpers/baseConfig'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {AdyenShopperDetailsService} from '../../services/shopper-details'
import {AdyenShippingMethodsService} from '../../services/shipping-methods'
import {AdyenShippingAddressService} from '../../services/shipping-address'
import {AdyenPaypalUpdateOrderService} from '../../services/paypal-update-order'
import {AdyenTemporaryBasketService} from '../../services/temporary-basket'
import {formatPayPalShopperDetails} from '../helpers/addressHelper'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'

jest.mock('../helpers/baseConfig')
jest.mock('../../utils/executeCallbacks')
jest.mock('../../services/shopper-details')
jest.mock('../../services/shipping-methods')
jest.mock('../../services/shipping-address')
jest.mock('../../services/paypal-update-order')
jest.mock('../../services/payment-data-review-page')
jest.mock('../../services/temporary-basket')
jest.mock('../helpers/addressHelper')
jest.mock('../../utils/parsers.mjs')

describe('paypal/expressConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        getCurrencyValueForApi.mockImplementation((value) => value)
    })

    describe('paypalExpressConfig', () => {
        it('should return config with base config and PayPal Express settings', () => {
            baseConfig.mockReturnValue({baseConfigField: 'value'})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const result = paypalExpressConfig({})

            expect(baseConfig).toHaveBeenCalled()
            expect(result).toHaveProperty('baseConfigField', 'value')
            expect(result).toHaveProperty('showPayButton', true)
            expect(result).toHaveProperty('isExpress', true)
        })

        it('should configure onSubmit with callbacks for cart flow', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const beforeSubmit = [jest.fn()]
            const afterSubmit = [jest.fn()]

            paypalExpressConfig({beforeSubmit, afterSubmit, type: 'cart', basket: {}})

            expect(executeCallbacks).toHaveBeenCalledWith(
                expect.arrayContaining([
                    ...beforeSubmit,
                    onSubmit,
                    ...afterSubmit,
                    onPaymentsSuccess
                ]),
                expect.any(Object)
            )
        })

        it('should configure onSubmit with createTemporaryBasketCallback for PDP flow', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const beforeSubmit = [jest.fn()]
            const afterSubmit = [jest.fn()]

            paypalExpressConfig({beforeSubmit, afterSubmit, type: 'pdp', basket: {}})

            expect(executeCallbacks).toHaveBeenCalledWith(
                expect.arrayContaining([
                    ...beforeSubmit,
                    createTemporaryBasketCallback,
                    onSubmit,
                    ...afterSubmit,
                    onPaymentsSuccess
                ]),
                expect.any(Object)
            )
        })

        it('should configure onAdditionalDetails with callbacks', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const beforeAdditionalDetails = [jest.fn()]
            const afterAdditionalDetails = [jest.fn()]

            paypalExpressConfig({beforeAdditionalDetails, afterAdditionalDetails})

            expect(executeCallbacks).toHaveBeenCalledWith(
                expect.arrayContaining([
                    ...beforeAdditionalDetails,
                    onAdditionalDetails,
                    ...afterAdditionalDetails,
                    onPaymentsDetailsSuccess
                ]),
                expect.any(Object)
            )
        })

        it('should configure onAuthorized with callbacks', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const beforeAuthorized = [jest.fn()]
            const afterAuthorized = [jest.fn()]

            paypalExpressConfig({beforeAuthorized, afterAuthorized})

            expect(executeCallbacks).toHaveBeenCalledWith(
                expect.arrayContaining([
                    ...beforeAuthorized,
                    onAuthorized,
                    ...afterAuthorized,
                    onAuthorizedSuccess
                ]),
                expect.any(Object)
            )
        })

        it('should configure onShippingAddressChange with callbacks', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const beforeShippingAddressChange = [jest.fn()]
            const afterShippingAddressChange = [jest.fn()]

            paypalExpressConfig({beforeShippingAddressChange, afterShippingAddressChange})

            expect(executeCallbacks).toHaveBeenCalledWith(
                expect.arrayContaining([
                    ...beforeShippingAddressChange,
                    onShippingAddressChange,
                    ...afterShippingAddressChange
                ]),
                expect.any(Object)
            )
        })

        it('should configure onShippingOptionsChange with callbacks', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const beforeShippingOptionsChange = [jest.fn()]
            const afterShippingOptionsChange = [jest.fn()]

            paypalExpressConfig({beforeShippingOptionsChange, afterShippingOptionsChange})

            expect(executeCallbacks).toHaveBeenCalledWith(
                expect.arrayContaining([
                    ...beforeShippingOptionsChange,
                    onShippingOptionsChange,
                    ...afterShippingOptionsChange
                ]),
                expect.any(Object)
            )
        })

        it('should merge additional configuration', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const configuration = {
                buttonStyle: {color: 'gold'},
                shippingPreference: 'NO_SHIPPING'
            }

            const result = paypalExpressConfig({configuration})

            expect(result).toHaveProperty('buttonStyle', configuration.buttonStyle)
            expect(result).toHaveProperty('shippingPreference', configuration.shippingPreference)
        })

        it('should handle empty props', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)

            const result = paypalExpressConfig({})

            expect(result).toHaveProperty('showPayButton', true)
            expect(result).toHaveProperty('isExpress', true)
        })

        it('should set amount with orderTotal from basket', () => {
            baseConfig.mockReturnValue({})
            executeCallbacks.mockImplementation((callbacks) => callbacks)
            getCurrencyValueForApi.mockReturnValue(10000)

            const result = paypalExpressConfig({basket: {orderTotal: 100, currency: 'USD'}})

            expect(getCurrencyValueForApi).toHaveBeenCalledWith(100, 'USD')
            expect(result.amount).toEqual({
                value: 10000,
                currency: 'USD'
            })
        })
    })

    describe('onPaymentsSuccess', () => {
        let state, component, actions, props, responses

        beforeEach(() => {
            state = {}
            component = {
                handleAction: jest.fn()
            }
            actions = {
                resolve: jest.fn(),
                reject: jest.fn()
            }
            props = {}
            responses = {}
        })

        it('should handle action if present in payment response', () => {
            responses.paymentsResponse = {
                action: {type: '3DS', data: 'test'}
            }

            onPaymentsSuccess(state, component, actions, props, responses)

            expect(component.handleAction).toHaveBeenCalledWith(responses.paymentsResponse.action)
            expect(actions.resolve).toHaveBeenCalledWith(responses.paymentsResponse)
        })

        it('should resolve without action if no action present', () => {
            responses.paymentsResponse = {
                resultCode: 'Authorised'
            }

            onPaymentsSuccess(state, component, actions, props, responses)

            expect(component.handleAction).not.toHaveBeenCalled()
            expect(actions.resolve).toHaveBeenCalledWith(responses.paymentsResponse)
        })

        it('should reject on error', () => {
            component.handleAction.mockImplementation(() => {
                throw new Error('Action failed')
            })
            responses.paymentsResponse = {action: {}}

            onPaymentsSuccess(state, component, actions, props, responses)

            expect(actions.reject).toHaveBeenCalledWith('Action failed')
        })

        it('should handle undefined responses', () => {
            onPaymentsSuccess(state, component, actions, props, undefined)

            expect(actions.resolve).toHaveBeenCalledWith(undefined)
        })
    })

    describe('createTemporaryBasketCallback', () => {
        let state, component, actions, props, mockTemporaryBasketService

        beforeEach(() => {
            state = {}
            component = {}
            actions = {
                resolve: jest.fn(),
                reject: jest.fn()
            }
            props = {
                token: 'test-token',
                customerId: 'customer123',
                site: {id: 'site-id'},
                product: {id: 'product123', quantity: 2},
                setBasket: jest.fn(),
                onError: [jest.fn()]
            }

            mockTemporaryBasketService = {
                createTemporaryBasket: jest.fn()
            }
            AdyenTemporaryBasketService.mockImplementation(() => mockTemporaryBasketService)
        })

        it('should create temporary basket and set it', async () => {
            const mockBasket = {basketId: 'temp-basket-123', orderTotal: 100}
            mockTemporaryBasketService.createTemporaryBasket.mockResolvedValue(mockBasket)

            await createTemporaryBasketCallback(state, component, actions, props)

            expect(AdyenTemporaryBasketService).toHaveBeenCalledWith('test-token', 'customer123', {
                id: 'site-id'
            })
            expect(mockTemporaryBasketService.createTemporaryBasket).toHaveBeenCalledWith({
                id: 'product123',
                quantity: 2
            })
            expect(props.setBasket).toHaveBeenCalledWith(mockBasket)
        })

        it('should reject if temporary basket creation fails', async () => {
            mockTemporaryBasketService.createTemporaryBasket.mockResolvedValue({})

            await createTemporaryBasketCallback(state, component, actions, props)

            expect(actions.reject).toHaveBeenCalledWith('Failed to create temporary basket')
            expect(props.onError[0]).toHaveBeenCalled()
        })

        it('should reject on error', async () => {
            mockTemporaryBasketService.createTemporaryBasket.mockRejectedValue(
                new Error('Service error')
            )

            await createTemporaryBasketCallback(state, component, actions, props)

            expect(actions.reject).toHaveBeenCalledWith('Service error')
            expect(props.onError[0]).toHaveBeenCalled()
        })
    })

    describe('onPaymentsDetailsSuccess', () => {
        let state, component, actions, props, responses

        beforeEach(() => {
            state = {}
            component = {}
            actions = {
                resolve: jest.fn(),
                reject: jest.fn()
            }
            props = {
                navigate: jest.fn()
            }
            responses = {}
        })

        it('should navigate to confirmation page on successful payment', async () => {
            responses.paymentsDetailsResponse = {
                isSuccessful: true,
                merchantReference: '00012345'
            }

            await onPaymentsDetailsSuccess(state, component, actions, props, responses)

            expect(props.navigate).toHaveBeenCalledWith('/checkout/confirmation/00012345')
            expect(actions.resolve).toHaveBeenCalledWith(responses.paymentsDetailsResponse)
        })

        it('should not navigate if payment is not successful', async () => {
            responses.paymentsDetailsResponse = {
                isSuccessful: false
            }

            await onPaymentsDetailsSuccess(state, component, actions, props, responses)

            expect(props.navigate).not.toHaveBeenCalled()
            expect(actions.resolve).toHaveBeenCalledWith(responses.paymentsDetailsResponse)
        })

        it('should reject on error', async () => {
            props.navigate.mockImplementation(() => {
                throw new Error('Navigation failed')
            })
            responses.paymentsDetailsResponse = {
                isSuccessful: true,
                merchantReference: '00012345'
            }

            await onPaymentsDetailsSuccess(state, component, actions, props, responses)

            expect(actions.reject).toHaveBeenCalledWith('Navigation failed')
        })
    })

    describe('onAuthorized', () => {
        let data, actions, props, mockShopperDetailsService

        beforeEach(() => {
            data = {
                authorizedEvent: {
                    payer: {
                        email_address: 'test@example.com',
                        name: {
                            given_name: 'John',
                            surname: 'Doe'
                        },
                        phone: {
                            phone_number: {
                                national_number: '+1234567890'
                            }
                        }
                    }
                },
                billingAddress: {street: '123 Billing St'},
                deliveryAddress: {street: '456 Delivery Ave'}
            }
            actions = {
                resolve: jest.fn(),
                reject: jest.fn()
            }
            props = {
                token: 'test-token',
                basket: {
                    basketId: 'basket123',
                    customerInfo: {
                        customerId: 'customer123'
                    }
                },
                getBasket: jest.fn(() => ({
                    basketId: 'basket123',
                    customerInfo: {
                        customerId: 'customer123'
                    }
                })),
                site: {id: 'site-id'}
            }

            mockShopperDetailsService = {
                updateShopperDetails: jest.fn()
            }
            AdyenShopperDetailsService.mockImplementation(() => mockShopperDetailsService)
        })

        it('should update shopper details with payer information', async () => {
            const mockResponse = {basketId: 'basket123'}
            mockShopperDetailsService.updateShopperDetails.mockResolvedValue(mockResponse)
            formatPayPalShopperDetails.mockReturnValue({
                deliveryAddress: {street: '456 Delivery Ave'},
                billingAddress: {street: '123 Billing St'},
                profile: {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1234567890'
                }
            })

            const result = await onAuthorized(data, actions, props)

            expect(AdyenShopperDetailsService).toHaveBeenCalledWith(
                'test-token',
                'customer123',
                'basket123',
                {id: 'site-id'}
            )

            expect(formatPayPalShopperDetails).toHaveBeenCalledWith(
                data.authorizedEvent.payer,
                {street: '456 Delivery Ave'},
                {street: '123 Billing St'}
            )

            expect(mockShopperDetailsService.updateShopperDetails).toHaveBeenCalledWith({
                deliveryAddress: {street: '456 Delivery Ave'},
                billingAddress: {street: '123 Billing St'},
                profile: {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1234567890'
                }
            })

            expect(result).toEqual({shopperDetailsResponse: mockResponse})
        })

        it('should handle missing payer data gracefully', async () => {
            data.authorizedEvent.payer = {}
            mockShopperDetailsService.updateShopperDetails.mockResolvedValue({})
            formatPayPalShopperDetails.mockReturnValue({
                deliveryAddress: {street: '456 Delivery Ave'},
                billingAddress: {street: '123 Billing St'},
                profile: {
                    email: '',
                    firstName: '',
                    lastName: '',
                    phone: ''
                }
            })

            await onAuthorized(data, actions, props)

            expect(formatPayPalShopperDetails).toHaveBeenCalledWith(
                {},
                {street: '456 Delivery Ave'},
                {street: '123 Billing St'}
            )

            expect(mockShopperDetailsService.updateShopperDetails).toHaveBeenCalledWith({
                deliveryAddress: {street: '456 Delivery Ave'},
                billingAddress: {street: '123 Billing St'},
                profile: {
                    email: '',
                    firstName: '',
                    lastName: '',
                    phone: ''
                }
            })
        })

        it('should reject on error', async () => {
            mockShopperDetailsService.updateShopperDetails.mockRejectedValue(
                new Error('Update failed')
            )

            await onAuthorized(data, actions, props)

            expect(actions.reject).toHaveBeenCalledWith('Update failed')
        })
    })

    describe('onAuthorizedSuccess', () => {
        it('should resolve actions', () => {
            const data = {}
            const actions = {
                resolve: jest.fn(),
                reject: jest.fn()
            }

            onAuthorizedSuccess(data, actions)

            expect(actions.resolve).toHaveBeenCalled()
        })

        it('should reject on error', () => {
            const data = {}
            const actions = {
                resolve: jest.fn(() => {
                    throw new Error('Resolve failed')
                }),
                reject: jest.fn()
            }

            onAuthorizedSuccess(data, actions)

            expect(actions.reject).toHaveBeenCalledWith('Resolve failed')
        })
    })

    describe('onShippingAddressChange', () => {
        let data, actions, component, props
        let mockShippingAddressService, mockShippingMethodsService, mockPaypalUpdateOrderService

        beforeEach(() => {
            data = {
                shippingAddress: {
                    city: 'New York',
                    countryCode: 'US',
                    postalCode: '10001',
                    state: 'NY',
                    street: '123 Main St'
                },
                errors: {
                    ADDRESS_ERROR: 'ADDRESS_ERROR'
                }
            }
            actions = {
                resolve: jest.fn(),
                reject: jest.fn()
            }
            component = {
                paymentData: 'current-payment-data',
                updatePaymentData: jest.fn()
            }
            props = {
                token: 'test-token',
                basket: {
                    basketId: 'basket123',
                    customerInfo: {customerId: 'customer123'}
                },
                getBasket: jest.fn(() => ({
                    basketId: 'basket123',
                    customerInfo: {customerId: 'customer123'}
                })),
                site: {id: 'site-id'},
                fetchShippingMethods: jest.fn()
            }

            mockShippingAddressService = {
                updateShippingAddress: jest.fn()
            }
            mockShippingMethodsService = {
                updateShippingMethod: jest.fn()
            }
            mockPaypalUpdateOrderService = {
                updatePaypalOrder: jest.fn()
            }

            AdyenShippingAddressService.mockImplementation(() => mockShippingAddressService)
            AdyenShippingMethodsService.mockImplementation(() => mockShippingMethodsService)
            AdyenPaypalUpdateOrderService.mockImplementation(() => mockPaypalUpdateOrderService)
            formatPayPalShopperDetails.mockReturnValue({
                deliveryAddress: data.shippingAddress,
                profile: {}
            })
        })

        it('should update shipping address and methods successfully', async () => {
            props.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: 'standard',
                applicableShippingMethods: [{id: 'standard'}, {id: 'express'}]
            })
            mockShippingAddressService.updateShippingAddress.mockResolvedValue({})
            mockShippingMethodsService.updateShippingMethod.mockResolvedValue({})
            mockPaypalUpdateOrderService.updatePaypalOrder.mockResolvedValue({
                paymentData: 'updated-payment-data'
            })

            await onShippingAddressChange(data, actions, component, props)

            expect(mockShippingAddressService.updateShippingAddress).toHaveBeenCalled()
            expect(mockShippingMethodsService.updateShippingMethod).toHaveBeenCalledWith('standard')
            expect(mockPaypalUpdateOrderService.updatePaypalOrder).toHaveBeenCalledWith(
                'current-payment-data'
            )
            expect(component.updatePaymentData).toHaveBeenCalledWith('updated-payment-data')
        })

        it('should use first shipping method if no default is set', async () => {
            props.fetchShippingMethods.mockResolvedValue({
                defaultShippingMethodId: null,
                applicableShippingMethods: [{id: 'method1'}, {id: 'method2'}]
            })
            mockShippingAddressService.updateShippingAddress.mockResolvedValue({})
            mockShippingMethodsService.updateShippingMethod.mockResolvedValue({})
            mockPaypalUpdateOrderService.updatePaypalOrder.mockResolvedValue({
                paymentData: 'updated-payment-data'
            })

            await onShippingAddressChange(data, actions, component, props)

            expect(mockShippingMethodsService.updateShippingMethod).toHaveBeenCalledWith('method1')
        })

        it('should reject if no shipping address provided', async () => {
            data.shippingAddress = null

            await onShippingAddressChange(data, actions, component, props)

            expect(actions.reject).toHaveBeenCalledWith('ADDRESS_ERROR')
        })

        it('should reject on error', async () => {
            mockShippingAddressService.updateShippingAddress.mockRejectedValue(
                new Error('Update failed')
            )

            await onShippingAddressChange(data, actions, component, props)

            expect(actions.reject).toHaveBeenCalledWith('ADDRESS_ERROR')
        })
    })

    describe('onShippingOptionsChange', () => {
        let data, actions, component, props
        let mockShippingMethodsService, mockPaypalUpdateOrderService

        beforeEach(() => {
            data = {
                selectedShippingOption: {
                    id: 'express'
                },
                errors: {
                    METHOD_UNAVAILABLE: 'METHOD_UNAVAILABLE'
                }
            }
            actions = {
                resolve: jest.fn(),
                reject: jest.fn()
            }
            component = {
                paymentData: 'current-payment-data',
                updatePaymentData: jest.fn()
            }
            props = {
                token: 'test-token',
                basket: {
                    basketId: 'basket123',
                    customerInfo: {customerId: 'customer123'}
                },
                getBasket: jest.fn(() => ({
                    basketId: 'basket123',
                    customerInfo: {customerId: 'customer123'}
                })),
                site: {id: 'site-id'}
            }

            mockShippingMethodsService = {
                updateShippingMethod: jest.fn()
            }
            mockPaypalUpdateOrderService = {
                updatePaypalOrder: jest.fn()
            }

            AdyenShippingMethodsService.mockImplementation(() => mockShippingMethodsService)
            AdyenPaypalUpdateOrderService.mockImplementation(() => mockPaypalUpdateOrderService)
        })

        it('should update shipping method successfully', async () => {
            mockShippingMethodsService.updateShippingMethod.mockResolvedValue({})
            mockPaypalUpdateOrderService.updatePaypalOrder.mockResolvedValue({
                paymentData: 'updated-payment-data'
            })

            await onShippingOptionsChange(data, actions, component, props)

            expect(mockShippingMethodsService.updateShippingMethod).toHaveBeenCalledWith('express')
            expect(mockPaypalUpdateOrderService.updatePaypalOrder).toHaveBeenCalledWith(
                'current-payment-data'
            )
            expect(component.updatePaymentData).toHaveBeenCalledWith('updated-payment-data')
        })

        it('should reject if no shipping method provided', async () => {
            data.selectedShippingOption = null

            await onShippingOptionsChange(data, actions, component, props)

            expect(actions.reject).toHaveBeenCalledWith('METHOD_UNAVAILABLE')
        })

        it('should reject on error', async () => {
            mockShippingMethodsService.updateShippingMethod.mockRejectedValue(
                new Error('Update failed')
            )

            await onShippingOptionsChange(data, actions, component, props)

            expect(actions.reject).toHaveBeenCalledWith('METHOD_UNAVAILABLE')
        })
    })
})
