/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import {
    getApplePaymentMethodConfig,
    getCustomerBillingDetails,
    getCustomerShippingDetails
} from '../helpers/applePayExpress.utils'

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
