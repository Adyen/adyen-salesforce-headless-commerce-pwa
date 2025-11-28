import {PaymentRequestBuilder} from '../PaymentRequestBuilder'
import {RECURRING_PROCESSING_MODEL, SHOPPER_INTERACTIONS} from '../../../utils/constants.mjs'
import Logger from '../logger'

// Mock dependencies
jest.mock('../../../utils/parsers.mjs', () => ({
    getCurrencyValueForApi: jest.fn((amount) => Math.round(amount * 100))
}))

jest.mock('../../../utils/formatAddress.mjs', () => ({
    formatAddressInAdyenFormat: jest.fn((address) => address)
}))

jest.mock('../../../utils/getApplicationInfo.mjs', () => ({
    getApplicationInfo: jest.fn((name) => ({name, version: '1.0.0'}))
}))

jest.mock('../logger', () => ({
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
}))

jest.mock('../../utils/paymentUtils.js', () => ({
    filterStateData: jest.fn((data) => data),
    getShopperName: jest.fn((basket) => {
        const firstName = basket?.billingAddress?.firstName
        const lastName = basket?.billingAddress?.lastName
        if (!firstName || !lastName) return undefined
        return {firstName, lastName}
    }),
    getNativeThreeDS: jest.fn(() => 'preferred'),
    isOpenInvoiceMethod: jest.fn((type) => type === 'klarna'),
    getLineItems: jest.fn(() => [{id: 'item1'}]),
    getLineItemsWithoutTax: jest.fn(() => [{id: 'item1'}]),
    getAdditionalData: jest.fn(() => ({'riskdata.basket.item1.itemID': 'item1'})),
    amountForPartialPayments: jest.fn(() => 5000)
}))

describe('PaymentRequestBuilder', () => {
    let builder
    let mockContext

    beforeEach(() => {
        jest.clearAllMocks()

        mockContext = {
            basket: {
                currency: 'USD',
                orderTotal: 100.5,
                productTotal: 90.0,
                c_orderNo: '00012345',
                customerInfo: {
                    customerId: 'customer123',
                    email: 'test@example.com'
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    postalCode: '10001',
                    country: 'US',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                shipments: [
                    {
                        shippingAddress: {
                            street: '456 Oak Ave',
                            city: 'Boston',
                            postalCode: '02101',
                            country: 'US'
                        }
                    }
                ]
            },
            stateData: {
                paymentMethod: {type: 'scheme'},
                origin: 'https://example.com',
                returnUrl: 'https://example.com/return'
            },
            adyenConfig: {
                merchantAccount: 'TestMerchant',
                systemIntegratorName: 'TestIntegrator',
                nativeThreeDS: 'preferred'
            },
            req: {
                ip: '127.0.0.1'
            }
        }
    })

    describe('constructor', () => {
        it('should initialize with empty payment request', () => {
            builder = new PaymentRequestBuilder()

            expect(builder.paymentRequest).toEqual({})
            expect(builder.isPartialPayment).toBe(false)
        })

        it('should initialize context with provided values', () => {
            builder = new PaymentRequestBuilder(mockContext)

            expect(builder.context.basket).toBe(mockContext.basket)
            expect(builder.context.stateData).toBe(mockContext.stateData)
            expect(builder.context.adyenConfig).toBe(mockContext.adyenConfig)
            expect(builder.context.req).toBe(mockContext.req)
        })

        it('should initialize context with null values when not provided', () => {
            builder = new PaymentRequestBuilder()

            expect(builder.context.basket).toBeNull()
            expect(builder.context.stateData).toBeNull()
            expect(builder.context.adyenConfig).toBeNull()
            expect(builder.context.req).toBeNull()
        })
    })

    describe('_validateAddress', () => {
        beforeEach(() => {
            builder = new PaymentRequestBuilder()
        })

        it('should return false and log warning for null address', () => {
            const result = builder._validateAddress(null, 'billing')

            expect(result).toBe(false)
            expect(Logger.warn).toHaveBeenCalledWith(
                'PaymentRequestBuilder: billing address is null or undefined'
            )
        })

        it('should return false and log warning for address missing required fields', () => {
            const address = {
                street: '123 Main St',
                city: 'New York'
                // missing postalCode and country
            }

            const result = builder._validateAddress(address, 'delivery')

            expect(result).toBe(false)
            expect(Logger.warn).toHaveBeenCalledWith(
                'PaymentRequestBuilder: delivery address missing required fields: postalCode, country',
                {address}
            )
        })

        it('should return true for valid address', () => {
            const address = {
                street: '123 Main St',
                city: 'New York',
                postalCode: '10001',
                country: 'US'
            }

            const result = builder._validateAddress(address, 'billing')

            expect(result).toBe(true)
            expect(Logger.warn).not.toHaveBeenCalled()
        })
    })

    describe('withStateData', () => {
        it('should add state data to payment request', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withStateData()

            expect(builder.paymentRequest.paymentMethod).toEqual({type: 'scheme'})
        })

        it('should use provided data over context data', () => {
            builder = new PaymentRequestBuilder(mockContext)
            const customData = {paymentMethod: {type: 'paypal'}}

            builder.withStateData(customData)

            expect(builder.paymentRequest.paymentMethod).toEqual({type: 'paypal'})
        })

        it('should return builder for chaining', () => {
            builder = new PaymentRequestBuilder(mockContext)
            const result = builder.withStateData()

            expect(result).toBe(builder)
        })
    })

    describe('withBillingAddress', () => {
        it('should add valid billing address', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withBillingAddress()

            expect(builder.paymentRequest.billingAddress).toEqual(mockContext.basket.billingAddress)
        })

        it('should not add invalid billing address', () => {
            mockContext.basket.billingAddress = {street: '123 Main St'} // missing required fields
            builder = new PaymentRequestBuilder(mockContext)
            builder.withBillingAddress()

            expect(builder.paymentRequest.billingAddress).toBeUndefined()
        })

        it('should use provided address over context', () => {
            builder = new PaymentRequestBuilder(mockContext)
            const customAddress = {
                street: '789 Custom St',
                city: 'Chicago',
                postalCode: '60601',
                country: 'US'
            }

            builder.withBillingAddress(customAddress)

            expect(builder.paymentRequest.billingAddress).toEqual(customAddress)
        })
    })

    describe('withDeliveryAddress', () => {
        it('should add valid delivery address', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withDeliveryAddress()

            expect(builder.paymentRequest.deliveryAddress).toEqual(
                mockContext.basket.shipments[0].shippingAddress
            )
        })

        it('should not add invalid delivery address', () => {
            mockContext.basket.shipments[0].shippingAddress = {street: '456 Oak Ave'}
            builder = new PaymentRequestBuilder(mockContext)
            builder.withDeliveryAddress()

            expect(builder.paymentRequest.deliveryAddress).toBeUndefined()
        })
    })

    describe('withReference', () => {
        it('should add reference from basket', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withReference()

            expect(builder.paymentRequest.reference).toBe('00012345')
        })

        it('should use provided reference', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withReference('custom-ref')

            expect(builder.paymentRequest.reference).toBe('custom-ref')
        })

        it('should not add reference if not available', () => {
            mockContext.basket.c_orderNo = null
            builder = new PaymentRequestBuilder(mockContext)
            builder.withReference()

            expect(builder.paymentRequest.reference).toBeUndefined()
        })
    })

    describe('withMerchantAccount', () => {
        it('should add merchant account from config', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withMerchantAccount()

            expect(builder.paymentRequest.merchantAccount).toBe('TestMerchant')
        })

        it('should use provided merchant account', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withMerchantAccount('CustomMerchant')

            expect(builder.paymentRequest.merchantAccount).toBe('CustomMerchant')
        })
    })

    describe('withAmount', () => {
        it('should add amount from basket order total', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withAmount()

            expect(builder.paymentRequest.amount).toEqual({
                value: 10050,
                currency: 'USD'
            })
        })

        it('should handle partial payments', () => {
            mockContext.stateData.order = {orderData: 'data'}
            builder = new PaymentRequestBuilder(mockContext)
            builder.withAmount()

            expect(builder.paymentRequest.amount.value).toBe(5000)
            expect(builder.isPartialPayment).toBe(true)
        })

        it('should not add amount if basket is missing', () => {
            builder = new PaymentRequestBuilder({})
            builder.withAmount()

            expect(builder.paymentRequest.amount).toBeUndefined()
        })
    })

    describe('withProductTotalAmount', () => {
        it('should add amount from basket product total', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withProductTotalAmount()

            expect(builder.paymentRequest.amount).toEqual({
                value: 9000,
                currency: 'USD'
            })
        })

        it('should not add amount if basket is missing', () => {
            builder = new PaymentRequestBuilder({})
            builder.withProductTotalAmount()

            expect(builder.paymentRequest.amount).toBeUndefined()
        })
    })

    describe('withApplicationInfo', () => {
        it('should add application info', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withApplicationInfo()

            expect(builder.paymentRequest.applicationInfo).toEqual({
                name: 'TestIntegrator',
                version: '1.0.0'
            })
        })

        it('should use provided system integrator name', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withApplicationInfo('CustomIntegrator')

            expect(builder.paymentRequest.applicationInfo).toEqual({
                name: 'CustomIntegrator',
                version: '1.0.0'
            })
        })
    })

    describe('withThreeDSAuthenticationData', () => {
        it('should add 3DS authentication data', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withThreeDSAuthenticationData()

            expect(builder.paymentRequest.authenticationData).toEqual({
                threeDSRequestData: {
                    nativeThreeDS: 'preferred'
                }
            })
        })

        it('should merge with existing authentication data', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.paymentRequest.authenticationData = {existingField: 'value'}
            builder.withThreeDSAuthenticationData()

            expect(builder.paymentRequest.authenticationData).toEqual({
                existingField: 'value',
                threeDSRequestData: {
                    nativeThreeDS: 'preferred'
                }
            })
        })
    })

    describe('withChannel', () => {
        it('should add default channel', () => {
            builder = new PaymentRequestBuilder()
            builder.withChannel()

            expect(builder.paymentRequest.channel).toBe('Web')
        })

        it('should add custom channel', () => {
            builder = new PaymentRequestBuilder()
            builder.withChannel('iOS')

            expect(builder.paymentRequest.channel).toBe('iOS')
        })
    })

    describe('withReturnUrl', () => {
        it('should add return URL from state data', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withReturnUrl()

            expect(builder.paymentRequest.returnUrl).toBe('https://example.com/return')
        })

        it('should construct return URL from origin if not provided', () => {
            mockContext.stateData.returnUrl = null
            builder = new PaymentRequestBuilder(mockContext)
            builder.withReturnUrl()

            expect(builder.paymentRequest.returnUrl).toBe('https://example.com/checkout/redirect')
        })

        it('should use provided return URL', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withReturnUrl('https://custom.com/return')

            expect(builder.paymentRequest.returnUrl).toBe('https://custom.com/return')
        })
    })

    describe('withShopperReference', () => {
        it('should add shopper reference from basket', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperReference()

            expect(builder.paymentRequest.shopperReference).toBe('customer123')
        })

        it('should use provided shopper reference', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperReference('custom-ref')

            expect(builder.paymentRequest.shopperReference).toBe('custom-ref')
        })
    })

    describe('withShopperEmail', () => {
        it('should add shopper email from basket', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperEmail()

            expect(builder.paymentRequest.shopperEmail).toBe('test@example.com')
        })

        it('should use provided shopper email', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperEmail('custom@example.com')

            expect(builder.paymentRequest.shopperEmail).toBe('custom@example.com')
        })
    })

    describe('withShopperIP', () => {
        it('should add shopper IP from request', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperIP()

            expect(builder.paymentRequest.shopperIP).toBe('127.0.0.1')
        })

        it('should use provided shopper IP', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperIP('192.168.1.1')

            expect(builder.paymentRequest.shopperIP).toBe('192.168.1.1')
        })
    })

    describe('withShopperName', () => {
        it('should add shopper name from basket', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperName()

            expect(builder.paymentRequest.shopperName).toEqual({
                firstName: 'John',
                lastName: 'Doe'
            })
        })

        it('should not add shopper name if not available', () => {
            mockContext.basket.billingAddress = {}
            builder = new PaymentRequestBuilder(mockContext)
            builder.withShopperName()

            expect(builder.paymentRequest.shopperName).toBeUndefined()
        })
    })

    describe('withOpenInvoiceData', () => {
        it('should add line items and country code for open invoice methods', () => {
            mockContext.stateData.paymentMethod.type = 'klarna'
            builder = new PaymentRequestBuilder(mockContext)
            builder.withBillingAddress() // Need billing address for country code
            builder.withOpenInvoiceData()

            expect(builder.paymentRequest.lineItems).toEqual([{id: 'item1'}])
            expect(builder.paymentRequest.countryCode).toBe('US')
        })

        it('should not add data for non-open invoice methods', () => {
            mockContext.stateData.paymentMethod.type = 'scheme'
            builder = new PaymentRequestBuilder(mockContext)
            builder.withOpenInvoiceData()

            expect(builder.paymentRequest.lineItems).toBeUndefined()
            expect(builder.paymentRequest.countryCode).toBeUndefined()
        })
    })

    describe('withRecurringProcessing', () => {
        it('should set recurring model when storing payment method', () => {
            mockContext.stateData.storePaymentMethod = true
            builder = new PaymentRequestBuilder(mockContext)
            builder.withRecurringProcessing()

            expect(builder.paymentRequest.recurringProcessingModel).toBe(
                RECURRING_PROCESSING_MODEL.CARD_ON_FILE
            )
            expect(builder.paymentRequest.shopperInteraction).toBe(SHOPPER_INTERACTIONS.ECOMMERCE)
        })

        it('should set ContAuth interaction for stored payment methods', () => {
            mockContext.stateData.paymentMethod.storedPaymentMethodId = 'stored123'
            builder = new PaymentRequestBuilder(mockContext)
            builder.withRecurringProcessing()

            expect(builder.paymentRequest.recurringProcessingModel).toBe(
                RECURRING_PROCESSING_MODEL.CARD_ON_FILE
            )
            expect(builder.paymentRequest.shopperInteraction).toBe(SHOPPER_INTERACTIONS.CONT_AUTH)
        })

        it('should set Ecommerce interaction by default', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withRecurringProcessing()

            expect(builder.paymentRequest.shopperInteraction).toBe(SHOPPER_INTERACTIONS.ECOMMERCE)
        })
    })

    describe('withAdditionalData', () => {
        it('should add additional risk data', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withAdditionalData()

            expect(builder.paymentRequest.additionalData).toEqual({
                'riskdata.basket.item1.itemID': 'item1'
            })
        })
    })

    describe('withLineItemsWithoutTax', () => {
        it('should add line items without tax', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withLineItemsWithoutTax()

            expect(builder.paymentRequest.lineItems).toEqual([{id: 'item1'}])
        })
    })

    describe('isPartialPaymentRequest', () => {
        it('should return false by default', () => {
            builder = new PaymentRequestBuilder()

            expect(builder.isPartialPaymentRequest()).toBe(false)
        })

        it('should return true after processing partial payment', () => {
            mockContext.stateData.order = {orderData: 'data'}
            builder = new PaymentRequestBuilder(mockContext)
            builder.withAmount()

            expect(builder.isPartialPaymentRequest()).toBe(true)
        })
    })

    describe('build', () => {
        it('should return the payment request object', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.withMerchantAccount().withChannel()

            const result = builder.build()

            expect(result).toEqual({
                merchantAccount: 'TestMerchant',
                channel: 'Web'
            })
        })

        it('should remove order object if it does not contain orderData', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.paymentRequest.order = {someField: 'value'}

            const result = builder.build()

            expect(result.order).toBeUndefined()
        })

        it('should keep order object if it contains orderData', () => {
            builder = new PaymentRequestBuilder(mockContext)
            builder.paymentRequest.order = {orderData: 'data', someField: 'value'}

            const result = builder.build()

            expect(result.order).toEqual({orderData: 'data', someField: 'value'})
        })
    })

    describe('createDefault', () => {
        it('should create builder with all default methods called', () => {
            const stateData = {
                paymentMethod: {type: 'scheme'},
                billingAddress: mockContext.basket.billingAddress,
                deliveryAddress: mockContext.basket.shipments[0].shippingAddress,
                origin: 'https://example.com'
            }
            const adyenContext = {
                basket: mockContext.basket,
                adyenConfig: mockContext.adyenConfig
            }
            const req = mockContext.req

            const builder = PaymentRequestBuilder.createDefault(stateData, adyenContext, req)

            expect(builder).toBeInstanceOf(PaymentRequestBuilder)
            expect(builder.context.basket).toBe(mockContext.basket)
            expect(builder.context.stateData).toBe(stateData)
            expect(builder.context.adyenConfig).toBe(mockContext.adyenConfig)
            expect(builder.context.req).toBe(req)
        })

        it('should return a builder instance ready to build', () => {
            const stateData = {
                paymentMethod: {type: 'scheme'},
                billingAddress: mockContext.basket.billingAddress,
                deliveryAddress: mockContext.basket.shipments[0].shippingAddress,
                origin: 'https://example.com'
            }
            const adyenContext = {
                basket: mockContext.basket,
                adyenConfig: mockContext.adyenConfig
            }
            const req = mockContext.req

            const builder = PaymentRequestBuilder.createDefault(stateData, adyenContext, req)
            const result = builder.build()

            expect(result).toHaveProperty('merchantAccount')
            expect(result).toHaveProperty('amount')
            expect(result).toHaveProperty('channel')
        })
    })

    describe('method chaining', () => {
        it('should allow fluent chaining of all methods', () => {
            builder = new PaymentRequestBuilder(mockContext)

            const result = builder
                .withStateData()
                .withBillingAddress()
                .withDeliveryAddress()
                .withReference()
                .withMerchantAccount()
                .withAmount()
                .withApplicationInfo()
                .withThreeDSAuthenticationData()
                .withChannel()
                .withReturnUrl()
                .withShopperReference()
                .withShopperEmail()
                .withShopperIP()
                .withShopperName()
                .withRecurringProcessing()
                .withAdditionalData()
                .build()

            expect(result).toHaveProperty('merchantAccount')
            expect(result).toHaveProperty('amount')
            expect(result).toHaveProperty('channel')
            expect(result).toHaveProperty('shopperEmail')
            expect(result).toHaveProperty('shopperReference')
        })
    })
})
