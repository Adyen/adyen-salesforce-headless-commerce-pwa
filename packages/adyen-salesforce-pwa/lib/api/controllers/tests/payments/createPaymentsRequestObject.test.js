import {createPaymentRequestObject} from '../../payments'
import {RECURRING_PROCESSING_MODEL, SHOPPER_INTERACTIONS} from '../../../../utils/constants.mjs'
import * as basketHelper from '../../../../utils/basketHelper.mjs'

// Mocking the util functions
jest.mock('../../../../utils/basketHelper.mjs')
jest.mock('../../../../utils/formatAddress.mjs', () => ({
    formatAddressInAdyenFormat: jest.fn((addr) => ({...addr, formatted: true}))
}))
jest.mock('../../../../utils/parsers.mjs', () => ({
    getCurrencyValueForApi: jest.fn((amount) => amount * 100)
}))
jest.mock('../../../../utils/getApplicationInfo.mjs', () => ({
    getApplicationInfo: jest.fn(() => ({
        name: 'SalesforceCommerceCloud',
        version: '1.0.0'
    }))
}))

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

    const mockAdyenConfig = {
        merchantAccount: 'AdyenMerchantAccount',
        systemIntegratorName: 'TestIntegrator'
    }

    const mockReq = {
        ip: '127.0.0.1',
        headers: {
            authorization: 'mock_token',
            basketid: 'mock_basket_id',
            customerid: 'mock_customer_id'
        }
    }

    beforeEach(() => {
        jest.clearAllMocks()
        basketHelper.getBasket.mockResolvedValue(mockBasket)
    })

    test('should create a basic payment request object correctly', async () => {
        const mockData = {
            origin: 'https://example.com',
            paymentMethod: {type: 'scheme'}
        }

        const paymentRequest = await createPaymentRequestObject(
            mockData,
            mockAdyenConfig,
            mockReq
        )

        expect(paymentRequest).toEqual({
            ...mockData,
            billingAddress: {street: '1 Billing St', firstName: 'John', lastName: 'Doe', formatted: true},
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
            mockAdyenConfig,
            mockReq
        )
        expect(paymentRequest.lineItems).toEqual([
            {
                amountExcludingTax: 2999,
                description: 'Striped Silk Tie',
                id: 'f9fe488b0b925984ffd1d5b360',
                quantity: 1,
                taxAmount: 150,
                taxCategory: 'None',
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
            mockAdyenConfig,
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
            mockAdyenConfig,
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
            mockAdyenConfig,
            mockReq
        )

        expect(paymentRequest.billingAddress).toEqual({street: 'Data Billing St'})
        expect(paymentRequest.deliveryAddress).toEqual({street: 'Data Shipping St'})
        // Ensure the formatter is NOT called when address is from data
        expect(
            require('../../../../utils/formatAddress.mjs').formatAddressInAdyenFormat
        ).not.toHaveBeenCalled()
    })

    test('should use custom returnUrl from data if provided', async () => {
        const mockData = {
            returnUrl: 'https://custom.return/url',
            paymentMethod: {type: 'scheme'}
        }

        const paymentRequest = await createPaymentRequestObject(
            mockData,
            mockAdyenConfig,
            mockReq
        )

        expect(paymentRequest.returnUrl).toBe('https://custom.return/url')
    })
})
