import {
    amountForPartialPayments,
    getShopperName,
    isOpenInvoiceMethod,
    getAdditionalData,
    getLineItems,
    getLineItemsWithoutTax,
    filterStateData,
    getNativeThreeDS
} from '../paymentUtils'
import {PAYMENT_METHOD_TYPES} from '../../../utils/constants.mjs'

// Mock getCurrencyValueForApi
jest.mock('../../../utils/parsers.mjs', () => ({
    getCurrencyValueForApi: jest.fn((amount) => Math.round(amount * 100))
}))

describe('paymentUtils', () => {
    describe('amountForPartialPayments', () => {
        it('should return the minimum of remaining amount and gift card balance for gift card payments', () => {
            const data = {
                paymentMethod: {type: PAYMENT_METHOD_TYPES.GIFT_CARD}
            }
            const basket = {
                c_orderData: JSON.stringify({
                    remainingAmount: {value: 5000}
                }),
                c_giftCardCheckBalance: JSON.stringify({
                    balance: {value: 3000}
                })
            }

            const result = amountForPartialPayments(data, basket)

            expect(result).toBe(3000)
        })

        it('should return remaining amount when gift card balance is higher', () => {
            const data = {
                paymentMethod: {type: PAYMENT_METHOD_TYPES.GIFT_CARD}
            }
            const basket = {
                c_orderData: JSON.stringify({
                    remainingAmount: {value: 2000}
                }),
                c_giftCardCheckBalance: JSON.stringify({
                    balance: {value: 5000}
                })
            }

            const result = amountForPartialPayments(data, basket)

            expect(result).toBe(2000)
        })

        it('should return remaining amount for non-gift card payments', () => {
            const data = {
                paymentMethod: {type: 'scheme'}
            }
            const basket = {
                c_orderData: JSON.stringify({
                    remainingAmount: {value: 4500}
                })
            }

            const result = amountForPartialPayments(data, basket)

            expect(result).toBe(4500)
        })

        it('should return 0 when c_orderData is missing', () => {
            const data = {
                paymentMethod: {type: 'scheme'}
            }
            const basket = {}

            const result = amountForPartialPayments(data, basket)

            expect(result).toBe(0)
        })

        it('should return 0 when gift card balance is missing', () => {
            const data = {
                paymentMethod: {type: PAYMENT_METHOD_TYPES.GIFT_CARD}
            }
            const basket = {
                c_orderData: JSON.stringify({
                    remainingAmount: {value: 5000}
                })
            }

            const result = amountForPartialPayments(data, basket)

            expect(result).toBe(0)
        })
    })

    describe('getShopperName', () => {
        it('should return shopper name when both firstName and lastName are present', () => {
            const basket = {
                billingAddress: {
                    firstName: 'John',
                    lastName: 'Doe'
                }
            }

            const result = getShopperName(basket)

            expect(result).toEqual({
                firstName: 'John',
                lastName: 'Doe'
            })
        })

        it('should return undefined when basket is null', () => {
            const result = getShopperName(null)

            expect(result).toBeUndefined()
        })

        it('should return undefined when billingAddress is missing', () => {
            const basket = {}

            const result = getShopperName(basket)

            expect(result).toBeUndefined()
        })

        it('should return undefined when firstName is missing', () => {
            const basket = {
                billingAddress: {
                    lastName: 'Doe'
                }
            }

            const result = getShopperName(basket)

            expect(result).toBeUndefined()
        })

        it('should return undefined when lastName is missing', () => {
            const basket = {
                billingAddress: {
                    firstName: 'John'
                }
            }

            const result = getShopperName(basket)

            expect(result).toBeUndefined()
        })

        it('should return undefined when firstName is empty string', () => {
            const basket = {
                billingAddress: {
                    firstName: '',
                    lastName: 'Doe'
                }
            }

            const result = getShopperName(basket)

            expect(result).toBeUndefined()
        })
    })

    describe('isOpenInvoiceMethod', () => {
        it('should return true for affirm payment method', () => {
            expect(isOpenInvoiceMethod('affirm')).toBe(true)
        })

        it('should return true for klarna payment methods', () => {
            expect(isOpenInvoiceMethod('klarna')).toBe(true)
            expect(isOpenInvoiceMethod('klarna_account')).toBe(true)
            expect(isOpenInvoiceMethod('klarna_paynow')).toBe(true)
        })

        it('should return true for afterpay payment methods', () => {
            expect(isOpenInvoiceMethod('afterpay')).toBe(true)
            expect(isOpenInvoiceMethod('afterpay_default')).toBe(true)
        })

        it('should return true for ratepay payment methods', () => {
            expect(isOpenInvoiceMethod('ratepay')).toBe(true)
            expect(isOpenInvoiceMethod('ratepay_directdebit')).toBe(true)
        })

        it('should return true for facilypay payment methods', () => {
            expect(isOpenInvoiceMethod('facilypay')).toBe(true)
            expect(isOpenInvoiceMethod('facilypay_3x')).toBe(true)
        })

        it('should return false for scheme payment method', () => {
            expect(isOpenInvoiceMethod('scheme')).toBe(false)
        })

        it('should return false for paypal payment method', () => {
            expect(isOpenInvoiceMethod('paypal')).toBe(false)
        })

        it('should return false for null', () => {
            expect(isOpenInvoiceMethod(null)).toBe(false)
        })

        it('should return false for undefined', () => {
            expect(isOpenInvoiceMethod(undefined)).toBe(false)
        })

        it('should return false for empty string', () => {
            expect(isOpenInvoiceMethod('')).toBe(false)
        })
    })

    describe('getAdditionalData', () => {
        it('should format product items into Adyen risk data format', () => {
            const basket = {
                currency: 'USD',
                productItems: [
                    {
                        itemId: 'item1',
                        productName: 'Product 1',
                        basePrice: 29.99,
                        quantity: 2
                    },
                    {
                        itemId: 'item2',
                        productName: 'Product 2',
                        basePrice: 49.99,
                        quantity: 1
                    }
                ]
            }

            const result = getAdditionalData(basket)

            expect(result).toEqual({
                'riskdata.basket.item1.itemID': 'item1',
                'riskdata.basket.item1.productTitle': 'Product 1',
                'riskdata.basket.item1.amountPerItem': 2999,
                'riskdata.basket.item1.quantity': 2,
                'riskdata.basket.item1.currency': 'USD',
                'riskdata.basket.item2.itemID': 'item2',
                'riskdata.basket.item2.productTitle': 'Product 2',
                'riskdata.basket.item2.amountPerItem': 4999,
                'riskdata.basket.item2.quantity': 1,
                'riskdata.basket.item2.currency': 'USD'
            })
        })

        it('should handle empty product items array', () => {
            const basket = {
                currency: 'USD',
                productItems: []
            }

            const result = getAdditionalData(basket)

            expect(result).toEqual({})
        })

        it('should handle single product item', () => {
            const basket = {
                currency: 'EUR',
                productItems: [
                    {
                        itemId: 'single-item',
                        productName: 'Single Product',
                        basePrice: 99.99,
                        quantity: 1
                    }
                ]
            }

            const result = getAdditionalData(basket)

            expect(result).toEqual({
                'riskdata.basket.item1.itemID': 'single-item',
                'riskdata.basket.item1.productTitle': 'Single Product',
                'riskdata.basket.item1.amountPerItem': 9999,
                'riskdata.basket.item1.quantity': 1,
                'riskdata.basket.item1.currency': 'EUR'
            })
        })
    })

    describe('getLineItems', () => {
        it('should map all basket items to Adyen line items with tax', () => {
            const basket = {
                currency: 'USD',
                productItems: [
                    {
                        itemId: 'prod1',
                        itemText: 'Product 1',
                        basePrice: 29.99,
                        tax: 2.4,
                        taxRate: 0.08,
                        quantity: 2
                    }
                ],
                shippingItems: [
                    {
                        itemId: 'ship1',
                        itemText: 'Standard Shipping',
                        basePrice: 5.99,
                        tax: 0.48,
                        taxRate: 0.08
                    }
                ],
                priceAdjustments: [
                    {
                        priceAdjustmentId: 'promo1',
                        itemText: '10% Off',
                        basePrice: -3.0,
                        tax: -0.24,
                        taxRate: 0.08,
                        quantity: 1
                    }
                ]
            }

            const result = getLineItems(basket)

            expect(result).toEqual([
                {
                    id: 'prod1',
                    quantity: 2,
                    description: 'Product 1',
                    amountExcludingTax: 2999,
                    taxAmount: 240,
                    taxPercentage: 0.08
                },
                {
                    id: 'ship1',
                    quantity: 1,
                    description: 'Standard Shipping',
                    amountExcludingTax: 599,
                    taxAmount: 48,
                    taxPercentage: 0.08
                },
                {
                    id: 'promo1',
                    quantity: 1,
                    description: '10% Off',
                    amountExcludingTax: -300,
                    taxAmount: -24,
                    taxPercentage: 0.08
                }
            ])
        })

        it('should handle basket with only product items', () => {
            const basket = {
                currency: 'USD',
                productItems: [
                    {
                        itemId: 'prod1',
                        itemText: 'Product 1',
                        basePrice: 50.0,
                        tax: 4.0,
                        taxRate: 0.08,
                        quantity: 1
                    }
                ]
            }

            const result = getLineItems(basket)

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('prod1')
        })

        it('should handle empty arrays gracefully', () => {
            const basket = {
                currency: 'USD',
                productItems: null,
                shippingItems: undefined,
                priceAdjustments: []
            }

            const result = getLineItems(basket)

            expect(result).toEqual([])
        })
    })

    describe('getLineItemsWithoutTax', () => {
        it('should map all basket items to Adyen line items without tax', () => {
            const basket = {
                currency: 'USD',
                productItems: [
                    {
                        itemId: 'prod1',
                        itemText: 'Product 1',
                        basePrice: 29.99,
                        quantity: 2
                    }
                ],
                shippingItems: [
                    {
                        itemId: 'ship1',
                        itemText: 'Standard Shipping',
                        basePrice: 5.99
                    }
                ],
                priceAdjustments: [
                    {
                        priceAdjustmentId: 'promo1',
                        itemText: '10% Off',
                        basePrice: -3.0,
                        quantity: 1
                    }
                ]
            }

            const result = getLineItemsWithoutTax(basket)

            expect(result).toEqual([
                {
                    id: 'prod1',
                    quantity: 2,
                    description: 'Product 1',
                    amountExcludingTax: 2999
                },
                {
                    id: 'ship1',
                    quantity: 1,
                    description: 'Standard Shipping',
                    amountExcludingTax: 599
                },
                {
                    id: 'promo1',
                    quantity: 1,
                    description: '10% Off',
                    amountExcludingTax: -300
                }
            ])
        })

        it('should not include tax fields in line items', () => {
            const basket = {
                currency: 'USD',
                productItems: [
                    {
                        itemId: 'prod1',
                        itemText: 'Product 1',
                        basePrice: 50.0,
                        tax: 4.0,
                        taxRate: 0.08,
                        quantity: 1
                    }
                ]
            }

            const result = getLineItemsWithoutTax(basket)

            expect(result[0]).not.toHaveProperty('taxAmount')
            expect(result[0]).not.toHaveProperty('taxPercentage')
            expect(result[0]).toHaveProperty('amountExcludingTax')
        })

        it('should handle empty arrays gracefully', () => {
            const basket = {
                currency: 'USD',
                productItems: null,
                shippingItems: undefined,
                priceAdjustments: []
            }

            const result = getLineItemsWithoutTax(basket)

            expect(result).toEqual([])
        })
    })

    describe('filterStateData', () => {
        it('should filter valid state data fields', () => {
            const stateData = {
                paymentMethod: {type: 'scheme'},
                billingAddress: {street: '123 Main St'},
                deliveryAddress: {street: '456 Oak Ave'},
                shopperEmail: 'test@example.com',
                invalidField: 'should be removed',
                anotherInvalidField: 123
            }

            const result = filterStateData(stateData)

            expect(result).toEqual({
                paymentMethod: {type: 'scheme'},
                billingAddress: {street: '123 Main St'},
                deliveryAddress: {street: '456 Oak Ave'},
                shopperEmail: 'test@example.com'
            })
            expect(result).not.toHaveProperty('invalidField')
            expect(result).not.toHaveProperty('anotherInvalidField')
        })

        it('should include all valid fields', () => {
            const stateData = {
                paymentMethod: {type: 'scheme'},
                billingAddress: {},
                deliveryAddress: {},
                riskData: {},
                shopperName: {firstName: 'John', lastName: 'Doe'},
                dateOfBirth: '1990-01-01',
                telephoneNumber: '+1234567890',
                shopperEmail: 'test@example.com',
                countryCode: 'US',
                socialSecurityNumber: '123-45-6789',
                browserInfo: {},
                installments: {value: 3},
                storePaymentMethod: true,
                conversionId: 'conv123',
                origin: 'https://example.com',
                returnUrl: 'https://example.com/return',
                order: {orderData: 'data'}
            }

            const result = filterStateData(stateData)

            expect(Object.keys(result)).toHaveLength(17)
            expect(result).toHaveProperty('paymentMethod')
            expect(result).toHaveProperty('billingAddress')
            expect(result).toHaveProperty('deliveryAddress')
            expect(result).toHaveProperty('riskData')
            expect(result).toHaveProperty('shopperName')
            expect(result).toHaveProperty('dateOfBirth')
            expect(result).toHaveProperty('telephoneNumber')
            expect(result).toHaveProperty('shopperEmail')
            expect(result).toHaveProperty('countryCode')
            expect(result).toHaveProperty('socialSecurityNumber')
            expect(result).toHaveProperty('browserInfo')
            expect(result).toHaveProperty('installments')
            expect(result).toHaveProperty('storePaymentMethod')
            expect(result).toHaveProperty('conversionId')
            expect(result).toHaveProperty('origin')
            expect(result).toHaveProperty('returnUrl')
            expect(result).toHaveProperty('order')
        })

        it('should return empty object when all fields are invalid', () => {
            const stateData = {
                invalidField1: 'value1',
                invalidField2: 'value2',
                invalidField3: 'value3'
            }

            const result = filterStateData(stateData)

            expect(result).toEqual({})
        })

        it('should handle empty object', () => {
            const stateData = {}

            const result = filterStateData(stateData)

            expect(result).toEqual({})
        })
    })

    describe('getNativeThreeDS', () => {
        it('should return "preferred" when nativeThreeDS is "preferred"', () => {
            const adyenConfig = {nativeThreeDS: 'preferred'}

            const result = getNativeThreeDS(adyenConfig)

            expect(result).toBe('preferred')
        })

        it('should return "disabled" when nativeThreeDS is "disabled"', () => {
            const adyenConfig = {nativeThreeDS: 'disabled'}

            const result = getNativeThreeDS(adyenConfig)

            expect(result).toBe('disabled')
        })

        it('should return "preferred" as default when nativeThreeDS is invalid', () => {
            const adyenConfig = {nativeThreeDS: 'invalid'}

            const result = getNativeThreeDS(adyenConfig)

            expect(result).toBe('preferred')
        })

        it('should return "preferred" as default when nativeThreeDS is missing', () => {
            const adyenConfig = {}

            const result = getNativeThreeDS(adyenConfig)

            expect(result).toBe('preferred')
        })

        it('should return "preferred" as default when nativeThreeDS is null', () => {
            const adyenConfig = {nativeThreeDS: null}

            const result = getNativeThreeDS(adyenConfig)

            expect(result).toBe('preferred')
        })

        it('should return "preferred" as default when nativeThreeDS is undefined', () => {
            const adyenConfig = {nativeThreeDS: undefined}

            const result = getNativeThreeDS(adyenConfig)

            expect(result).toBe('preferred')
        })

        it('should return "preferred" as default for empty string', () => {
            const adyenConfig = {nativeThreeDS: ''}

            const result = getNativeThreeDS(adyenConfig)

            expect(result).toBe('preferred')
        })
    })
})
