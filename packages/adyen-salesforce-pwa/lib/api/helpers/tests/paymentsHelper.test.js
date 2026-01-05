import {
    createCheckoutResponse,
    createPaymentRequestObject,
    revertCheckoutState,
    validateBasketPayments
} from '../paymentsHelper.js'
import {
    amountForPartialPayments,
    getAdditionalData,
    getLineItems,
    getShopperName,
    isOpenInvoiceMethod
} from '../../utils/paymentUtils.js'
import {
    RECURRING_PROCESSING_MODEL,
    RESULT_CODES,
    SHOPPER_INTERACTIONS
} from '../../../utils/constants.mjs'
import {AdyenError} from '../../models/AdyenError.js'

// Mocking the util functions
jest.mock('../../models/logger')

jest.mock('../../../utils/formatAddress.mjs', () => ({
    formatAddressInAdyenFormat: jest.fn((addr) => ({...addr, formatted: true}))
}))
jest.mock('../../../utils/parsers.mjs', () => ({
    getCurrencyValueForApi: jest.fn((amount) => Math.round(amount * 100))
}))
jest.mock('../../../utils/getApplicationInfo.mjs', () => ({
    getApplicationInfo: jest.fn(() => ({
        name: 'SalesforceCommerceCloud',
        version: '1.0.0'
    }))
}))

const mockPaymentsApi = jest.fn()
const mockOrdersApi = {
    cancelOrder: jest.fn()
}
jest.mock('../../models/adyenClientProvider.js', () => {
    return jest.fn().mockImplementation(() => {
        return {
            getPaymentsApi: () => mockPaymentsApi,
            getOrdersApi: () => mockOrdersApi
        }
    })
})

describe('paymentsHelper', () => {
    describe('createCheckoutResponse', () => {
        const orderNo = 'order123'

        it('should return final successful response for AUTHORISED', () => {
            const response = {resultCode: RESULT_CODES.AUTHORISED, merchantReference: 'ref1'}
            const checkoutResponse = createCheckoutResponse(response, orderNo)
            expect(checkoutResponse).toEqual({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'ref1'
            })
        })

        it('should return final successful response for RECEIVED', () => {
            const response = {resultCode: RESULT_CODES.RECEIVED, merchantReference: 'ref2'}
            const checkoutResponse = createCheckoutResponse(response, orderNo)
            expect(checkoutResponse).toEqual({
                isFinal: true,
                isSuccessful: true,
                merchantReference: 'ref2'
            })
        })

        it('should return non-final successful response for REDIRECT', () => {
            const response = {
                resultCode: RESULT_CODES.REDIRECT_SHOPPER,
                action: 'redirectAction',
                merchantReference: 'ref3'
            }
            const checkoutResponse = createCheckoutResponse(response, orderNo)
            expect(checkoutResponse).toEqual({
                isFinal: false,
                isSuccessful: true,
                action: 'redirectAction',
                merchantReference: 'ref3'
            })
        })

        it('should return non-final successful response for PRESENT_TO_SHOPPER', () => {
            const response = {
                resultCode: RESULT_CODES.PRESENT_TO_SHOPPER,
                action: 'presentAction',
                merchantReference: 'ref4'
            }
            const checkoutResponse = createCheckoutResponse(response, orderNo)
            expect(checkoutResponse).toEqual({
                isFinal: false,
                isSuccessful: true,
                action: 'presentAction',
                merchantReference: 'ref4'
            })
        })

        it('should return final unsuccessful response for other resultCodes', () => {
            const response = {resultCode: 'UNKNOWN', merchantReference: 'ref5'}
            const checkoutResponse = createCheckoutResponse(response, orderNo)
            expect(checkoutResponse).toEqual({
                isFinal: true,
                isSuccessful: false,
                merchantReference: 'ref5'
            })
        })

        it('should return final unsuccessful response with refusalReason', () => {
            const response = {
                resultCode: RESULT_CODES.REFUSED,
                refusalReason: 'Insufficient Funds'
            }
            const checkoutResponse = createCheckoutResponse(response, orderNo)
            expect(checkoutResponse.isSuccessful).toBe(false)
            expect(checkoutResponse.isFinal).toBe(true)
            expect(checkoutResponse.refusalReason).toBe('Insufficient Funds')
        })

        it('should use orderNo as fallback for merchantReference', () => {
            const response = {resultCode: RESULT_CODES.AUTHORISED}
            const checkoutResponse = createCheckoutResponse(response, orderNo)
            expect(checkoutResponse).toEqual({
                isFinal: true,
                isSuccessful: true,
                merchantReference: orderNo
            })
        })
    })

    describe('amountForPartialPayments', () => {
        it('should return the gift card balance if it is less than the remaining amount', () => {
            const data = {paymentMethod: {type: 'giftcard'}}
            const basket = {
                c_orderData: JSON.stringify({remainingAmount: {value: 10000}}),
                c_giftCardCheckBalance: JSON.stringify({balance: {value: 5000}})
            }
            expect(amountForPartialPayments(data, basket)).toBe(5000)
        })

        it('should return the remaining amount if it is less than the gift card balance', () => {
            const data = {paymentMethod: {type: 'giftcard'}}
            const basket = {
                c_orderData: JSON.stringify({remainingAmount: {value: 3000}}),
                c_giftCardCheckBalance: JSON.stringify({balance: {value: 5000}})
            }
            expect(amountForPartialPayments(data, basket)).toBe(3000)
        })

        it('should return the remaining amount for non-gift card payments', () => {
            const data = {paymentMethod: {type: 'scheme'}}
            const basket = {c_orderData: JSON.stringify({remainingAmount: {value: 10000}})}
            expect(amountForPartialPayments(data, basket)).toBe(10000)
        })
    })

    describe('getAdditionalData', () => {
        it('should format product items into Adyen risk data format', () => {
            const basket = {
                currency: 'EUR',
                productItems: [
                    {
                        itemId: 'item1',
                        productName: 'Product A',
                        basePrice: 10,
                        quantity: 2
                    },
                    {
                        itemId: 'item2',
                        productName: 'Product B',
                        basePrice: 25.5,
                        quantity: 1
                    }
                ]
            }
            const additionalData = getAdditionalData(basket)
            expect(additionalData).toEqual({
                'riskdata.basket.item1.itemID': 'item1',
                'riskdata.basket.item1.productTitle': 'Product A',
                'riskdata.basket.item1.amountPerItem': 1000,
                'riskdata.basket.item1.quantity': 2,
                'riskdata.basket.item1.currency': 'EUR',
                'riskdata.basket.item2.itemID': 'item2',
                'riskdata.basket.item2.productTitle': 'Product B',
                'riskdata.basket.item2.amountPerItem': 2550,
                'riskdata.basket.item2.quantity': 1,
                'riskdata.basket.item2.currency': 'EUR'
            })
        })
    })

    describe('getLineItems', () => {
        it('should map all basket items to Adyen line items', () => {
            const basket = {
                currency: 'GBP',
                productItems: [
                    {
                        itemId: 'prod1',
                        itemText: 'Product 1',
                        basePrice: 50,
                        tax: 10,
                        taxRate: 0.2,
                        quantity: 1
                    }
                ],
                shippingItems: [
                    {
                        itemId: 'ship1',
                        itemText: 'Standard Shipping',
                        basePrice: 5,
                        tax: 1,
                        taxRate: 0.2
                    }
                ],
                priceAdjustments: [
                    {
                        priceAdjustmentId: 'promo1',
                        itemText: '10% Off',
                        basePrice: -5.5,
                        tax: -1.1,
                        taxRate: 0.2,
                        quantity: 1
                    }
                ]
            }
            const lineItems = getLineItems(basket, 'afterpay')
            expect(lineItems).toHaveLength(3)
            expect(lineItems).toContainEqual({
                id: 'prod1',
                quantity: 1,
                description: 'Product 1',
                amountExcludingTax: 5000,
                taxAmount: 1000,
                taxPercentage: 0.2
            })
            expect(lineItems).toContainEqual({
                id: 'ship1',
                quantity: 1,
                description: 'Standard Shipping',
                amountExcludingTax: 500,
                taxAmount: 100,
                taxPercentage: 0.2
            })
            expect(lineItems).toContainEqual({
                id: 'promo1',
                quantity: 1,
                description: '10% Off',
                amountExcludingTax: -550,
                taxAmount: -110,
                taxPercentage: 0.2
            })
        })
    })

    describe('validateBasketPayments', () => {
        let mockAdyenContext
        beforeEach(() => {
            mockAdyenContext = {
                basket: {
                    orderTotal: 100,
                    currency: 'USD',
                    paymentInstruments: []
                },
                adyenConfig: {
                    merchantAccount: 'AdyenMerchantAccount'
                },
                basketService: {
                    update: jest.fn(),
                    removeAllPaymentInstruments: jest.fn()
                }
            }
        })

        it('should not throw for a valid full payment', async () => {
            const amount = {value: 10000}
            const paymentMethod = {type: 'scheme'}
            await expect(
                validateBasketPayments(mockAdyenContext, amount, paymentMethod)
            ).resolves.toBeUndefined()
        })

        it('should throw if the final amount exceeds the basket total', async () => {
            const amount = {value: 10001}
            const paymentMethod = {type: 'scheme'}
            await expect(
                validateBasketPayments(mockAdyenContext, amount, paymentMethod)
            ).rejects.toThrow(new AdyenError('amounts do not match', 409))
        })

        it('should throw if the final amount is less than the basket total for a non-partial payment', async () => {
            const amount = {value: 9999}
            const paymentMethod = {type: 'scheme'}
            await expect(
                validateBasketPayments(mockAdyenContext, amount, paymentMethod)
            ).rejects.toThrow(new AdyenError('amounts do not match', 409))
        })

        it('should throw if basket total changes during partial payment', async () => {
            mockAdyenContext.basket.c_orderData = JSON.stringify({
                orderData: '...',
                amount: {value: 9000} // Original total was 90
            })
            const amount = {value: 1000}
            const paymentMethod = {type: 'scheme'}
            await expect(
                validateBasketPayments(mockAdyenContext, amount, paymentMethod)
            ).rejects.toThrow(new AdyenError('basket changed', 409, {basketChanged: true}))
            expect(mockOrdersApi.cancelOrder).not.toHaveBeenCalled()
        })
    })

    describe('revertCheckoutState', () => {
        let mockAdyenContext
        beforeEach(() => {
            mockAdyenContext = {
                basket: {},
                adyenConfig: {
                    merchantAccount: 'AdyenMerchantAccount'
                },
                basketService: {
                    update: jest.fn(),
                    removeAllPaymentInstruments: jest.fn()
                }
            }
        })

        it('should throw an error if adyenContext is not provided', async () => {
            await expect(revertCheckoutState(null, 'test')).rejects.toThrow(
                new AdyenError('Adyen context not found in test', 500)
            )
        })

        it('should call _cleanupBasket for a full payment failure', async () => {
            await revertCheckoutState(mockAdyenContext, 'test')
            expect(mockAdyenContext.basketService.update).toHaveBeenCalledWith({
                c_orderData: '',
                c_giftCardCheckBalance: '',
                c_paymentMethod: '',
                c_amount: '',
                c_pspReference: '',
                c_paymentDataForReviewPage: ''
            })
            expect(mockAdyenContext.basketService.removeAllPaymentInstruments).toHaveBeenCalled()
        })

        it('should call cancelAdyenOrder for a partial payment failure', async () => {
            mockAdyenContext.basket.c_orderData = JSON.stringify({orderData: '...'})
            mockOrdersApi.cancelOrder.mockResolvedValue({resultCode: 'Received'})
            await revertCheckoutState(mockAdyenContext, 'test')
            expect(mockOrdersApi.cancelOrder).toHaveBeenCalled()
            // _cleanupBasket is called inside cancelAdyenOrder, so we check its effects
            expect(mockAdyenContext.basketService.update).toHaveBeenCalled()
            expect(mockAdyenContext.basketService.removeAllPaymentInstruments).toHaveBeenCalled()
        })
    })

    describe('getShopperName', () => {
        it('should extract first and last name from billing address', () => {
            const basket = {billingAddress: {firstName: 'John', lastName: 'Doe'}}
            expect(getShopperName(basket)).toEqual({firstName: 'John', lastName: 'Doe'})
        })
    })

    describe('isOpenInvoiceMethod', () => {
        it.each([
            ['klarna', true],
            ['afterpay', true],
            ['ratepay', true],
            ['zip', true],
            ['affirm', true],
            ['clearpay', true],
            ['scheme', false],
            ['googlepay', false],
            [null, false],
            [undefined, false]
        ])('should return %s for payment method type %s', (type, expected) => {
            expect(isOpenInvoiceMethod(type)).toBe(expected)
        })
    })

    describe('createPaymentRequestObject', () => {
        const mockBasket = {
            c_orderNo: '00012345',
            orderTotal: 150.5,
            currency: 'USD',
            billingAddress: {street: '1 Billing St', firstName: 'John', lastName: 'Doe'},
            shipments: [{shippingAddress: {street: '1 Shipping St'}}],
            customerInfo: {
                customerId: 'customer123',
                email: 'test@example.com'
            },
            productItems: [
                {
                    adjustedTax: 1.5,
                    basePrice: 29.99,
                    bonusProductLineItem: false,
                    gift: false,
                    itemId: 'f9fe488b0b925984ffd1d5b360',
                    itemText: 'Striped Silk Tie',
                    price: 29.99,
                    priceAfterItemDiscount: 29.99,
                    priceAfterOrderDiscount: 29.99,
                    productId: '793775362380M',
                    productName: 'Striped Silk Tie',
                    quantity: 1,
                    shipmentId: 'me',
                    tax: 1.5,
                    taxBasis: 29.99,
                    taxClassId: 'standard',
                    taxRate: 0.05
                }
            ]
        }

        const mockAdyenContext = {
            basket: mockBasket,
            adyenConfig: {
                merchantAccount: 'AdyenMerchantAccount',
                systemIntegratorName: 'TestIntegrator'
            }
        }

        const mockReq = {
            ip: '127.0.0.1'
        }

        beforeEach(() => {
            jest.clearAllMocks()
        })

        test('should create a basic payment request object correctly', async () => {
            const mockData = {
                origin: 'https://example.com',
                paymentMethod: {type: 'scheme'},
                billingAddress: {
                    street: '1 Billing St',
                    firstName: 'John',
                    lastName: 'Doe',
                    formatted: true
                },
                deliveryAddress: {street: '1 Shipping St', formatted: true}
            }

            const paymentRequest = await createPaymentRequestObject(
                mockData,
                mockAdyenContext,
                mockReq
            )

            expect(paymentRequest).toEqual({
                ...mockData,
                billingAddress: {
                    street: '1 Billing St',
                    firstName: 'John',
                    lastName: 'Doe',
                    formatted: true
                },
                deliveryAddress: {street: '1 Shipping St', formatted: true},
                reference: '00012345',
                merchantAccount: 'AdyenMerchantAccount',
                amount: {
                    value: 15050,
                    currency: 'USD'
                },
                applicationInfo: {name: 'SalesforceCommerceCloud', version: '1.0.0'},
                authenticationData: {
                    threeDSRequestData: {nativeThreeDS: 'preferred'}
                },
                channel: 'Web',
                returnUrl: 'https://example.com/checkout/redirect',
                shopperReference: 'customer123',
                shopperEmail: 'test@example.com',
                shopperName: {firstName: 'John', lastName: 'Doe'},
                shopperIP: '127.0.0.1',
                shopperInteraction: SHOPPER_INTERACTIONS.ECOMMERCE,
                additionalData: {
                    'riskdata.basket.item1.amountPerItem': 2999,
                    'riskdata.basket.item1.currency': 'USD',
                    'riskdata.basket.item1.itemID': 'f9fe488b0b925984ffd1d5b360',
                    'riskdata.basket.item1.productTitle': 'Striped Silk Tie',
                    'riskdata.basket.item1.quantity': 1
                }
            })
        })

        test('should include lineItems for open invoice payment methods', async () => {
            const mockData = {
                paymentMethod: {type: 'klarna'},
                billingAddress: {country: 'DE'}
            }

            const paymentRequest = await createPaymentRequestObject(
                mockData,
                mockAdyenContext,
                mockReq
            )
            expect(paymentRequest.lineItems).toEqual([
                {
                    amountExcludingTax: 2999,
                    description: 'Striped Silk Tie',
                    id: 'f9fe488b0b925984ffd1d5b360',
                    quantity: 1,
                    taxAmount: 150,
                    taxPercentage: 0.05
                }
            ])
            expect(paymentRequest.countryCode).toBe('DE')
        })

        test('should set recurringProcessingModel when storePaymentMethod is true', async () => {
            const mockData = {
                storePaymentMethod: true,
                paymentMethod: {type: 'scheme'}
            }

            const paymentRequest = await createPaymentRequestObject(
                mockData,
                mockAdyenContext,
                mockReq
            )

            expect(paymentRequest.recurringProcessingModel).toBe(
                RECURRING_PROCESSING_MODEL.CARD_ON_FILE
            )
            expect(paymentRequest.shopperInteraction).toBe(SHOPPER_INTERACTIONS.ECOMMERCE)
        })

        test('should set recurring model and ContAuth interaction for stored payment methods', async () => {
            const mockData = {
                paymentMethod: {
                    type: 'scheme',
                    storedPaymentMethodId: 'stored_card_123'
                }
            }

            const paymentRequest = await createPaymentRequestObject(
                mockData,
                mockAdyenContext,
                mockReq
            )

            expect(paymentRequest.recurringProcessingModel).toBe(
                RECURRING_PROCESSING_MODEL.CARD_ON_FILE
            )
            expect(paymentRequest.shopperInteraction).toBe(SHOPPER_INTERACTIONS.CONT_AUTH)
        })

        test('should use billing and delivery addresses from data if provided', async () => {
            const mockData = {
                billingAddress: {street: 'Data Billing St'},
                deliveryAddress: {street: 'Data Shipping St'},
                paymentMethod: {type: 'scheme'}
            }

            const paymentRequest = await createPaymentRequestObject(
                mockData,
                mockAdyenContext,
                mockReq
            )

            expect(paymentRequest.billingAddress).toEqual({street: 'Data Billing St'})
            expect(paymentRequest.deliveryAddress).toEqual({street: 'Data Shipping St'})
            // Ensure the formatter is NOT called when address is from data
            expect(
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require('../../../utils/formatAddress.mjs').formatAddressInAdyenFormat
            ).not.toHaveBeenCalled()
        })

        test('should use custom returnUrl from data if provided', async () => {
            const mockData = {
                returnUrl: 'https://custom.return/url',
                paymentMethod: {type: 'scheme'}
            }

            const paymentRequest = await createPaymentRequestObject(
                mockData,
                mockAdyenContext,
                mockReq
            )

            expect(paymentRequest.returnUrl).toBe('https://custom.return/url')
        })
    })
})
