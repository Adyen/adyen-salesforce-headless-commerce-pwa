import {formatPayPalDeliveryAddress, formatPayPalShopperDetails} from '../helpers/addressHelper'

describe('addressHelper', () => {
    describe('formatPayPalDeliveryAddress', () => {
        it('should format onShippingAddressChange format (countryCode, state)', () => {
            const paypalAddress = {
                city: 'test',
                countryCode: 'US',
                postalCode: '95131',
                state: 'CA'
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: 'test',
                country: 'US',
                postalCode: '95131',
                stateOrProvince: 'CA',
                street: ''
            })
        })

        it('should format onAuthorized format (country, stateOrProvince)', () => {
            const paypalAddress = {
                houseNumberOrName: 'ZZ',
                street: '1 Main St',
                stateOrProvince: 'CA',
                city: 'San Jose',
                postalCode: '95131',
                country: 'US'
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: 'San Jose',
                country: 'US',
                postalCode: '95131',
                stateOrProvince: 'CA',
                street: '1 Main St'
            })
        })

        it('should format complete PayPal shipping address with countryCode', () => {
            const paypalAddress = {
                city: 'New York',
                countryCode: 'US',
                postalCode: '10001',
                state: 'NY',
                street: '123 Main St'
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: 'New York',
                country: 'US',
                postalCode: '10001',
                stateOrProvince: 'NY',
                street: '123 Main St'
            })
        })

        it('should handle missing optional fields with empty strings', () => {
            const paypalAddress = {
                city: 'Boston',
                countryCode: 'US'
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: 'Boston',
                country: 'US',
                postalCode: '',
                stateOrProvince: '',
                street: ''
            })
        })

        it('should return null when address is null', () => {
            const result = formatPayPalDeliveryAddress(null)

            expect(result).toBeNull()
        })

        it('should return null when address is undefined', () => {
            const result = formatPayPalDeliveryAddress(undefined)

            expect(result).toBeNull()
        })

        it('should handle empty address object', () => {
            const result = formatPayPalDeliveryAddress({})

            expect(result).toEqual({
                city: '',
                country: '',
                postalCode: '',
                stateOrProvince: '',
                street: ''
            })
        })

        it('should handle address with all empty string values', () => {
            const paypalAddress = {
                city: '',
                countryCode: '',
                postalCode: '',
                state: '',
                street: ''
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: '',
                country: '',
                postalCode: '',
                stateOrProvince: '',
                street: ''
            })
        })

        it('should handle address with null values', () => {
            const paypalAddress = {
                city: null,
                countryCode: null,
                postalCode: null,
                state: null,
                street: null
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: '',
                country: '',
                postalCode: '',
                stateOrProvince: '',
                street: ''
            })
        })

        it('should handle address with undefined values', () => {
            const paypalAddress = {
                city: undefined,
                countryCode: undefined,
                postalCode: undefined,
                state: undefined,
                street: undefined
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: '',
                country: '',
                postalCode: '',
                stateOrProvince: '',
                street: ''
            })
        })

        it('should handle international address', () => {
            const paypalAddress = {
                city: 'London',
                countryCode: 'GB',
                postalCode: 'SW1A 1AA',
                state: '',
                street: '10 Downing Street'
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: 'London',
                country: 'GB',
                postalCode: 'SW1A 1AA',
                stateOrProvince: '',
                street: '10 Downing Street'
            })
        })

        it('should handle address with special characters', () => {
            const paypalAddress = {
                city: 'São Paulo',
                countryCode: 'BR',
                postalCode: '01310-100',
                state: 'SP',
                street: 'Avenida Paulista, 1578'
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result).toEqual({
                city: 'São Paulo',
                country: 'BR',
                postalCode: '01310-100',
                stateOrProvince: 'SP',
                street: 'Avenida Paulista, 1578'
            })
        })

        it('should handle long street address', () => {
            const paypalAddress = {
                city: 'New York',
                countryCode: 'US',
                postalCode: '10001',
                state: 'NY',
                street: '123 Main Street, Apartment 4B, Building C, Floor 2'
            }

            const result = formatPayPalDeliveryAddress(paypalAddress)

            expect(result.street).toBe('123 Main Street, Apartment 4B, Building C, Floor 2')
        })
    })

    describe('formatPayPalShopperDetails', () => {
        it('should format complete payer and delivery address without billing', () => {
            const payer = {
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
            const deliveryAddress = {
                city: 'New York',
                countryCode: 'US',
                postalCode: '10001',
                state: 'NY',
                street: '123 Main St'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result).toEqual({
                deliveryAddress: {
                    city: 'New York',
                    country: 'US',
                    postalCode: '10001',
                    stateOrProvince: 'NY',
                    street: '123 Main St'
                },
                profile: {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1234567890'
                }
            })
        })

        it('should format complete payer with delivery and billing addresses', () => {
            const payer = {
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
            const deliveryAddress = {
                city: 'New York',
                countryCode: 'US',
                postalCode: '10001',
                state: 'NY',
                street: '123 Main St'
            }
            const billingAddress = {
                city: 'Boston',
                country: 'US',
                postalCode: '02101',
                stateOrProvince: 'MA',
                street: '456 Billing Ave'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress, billingAddress)

            expect(result).toEqual({
                deliveryAddress: {
                    city: 'New York',
                    country: 'US',
                    postalCode: '10001',
                    stateOrProvince: 'NY',
                    street: '123 Main St'
                },
                billingAddress: {
                    city: 'Boston',
                    country: 'US',
                    postalCode: '02101',
                    stateOrProvince: 'MA',
                    street: '456 Billing Ave'
                },
                profile: {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1234567890'
                }
            })
        })

        it('should handle null payer', () => {
            const deliveryAddress = {
                city: 'New York',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails(null, deliveryAddress)

            expect(result).toEqual({
                deliveryAddress: {
                    city: 'New York',
                    country: 'US',
                    postalCode: '',
                    stateOrProvince: '',
                    street: ''
                },
                profile: {
                    email: '',
                    firstName: '',
                    lastName: '',
                    phone: ''
                }
            })
        })

        it('should handle undefined payer', () => {
            const deliveryAddress = {
                city: 'Boston',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails(undefined, deliveryAddress)

            expect(result).toEqual({
                deliveryAddress: {
                    city: 'Boston',
                    country: 'US',
                    postalCode: '',
                    stateOrProvince: '',
                    street: ''
                },
                profile: {
                    email: '',
                    firstName: '',
                    lastName: '',
                    phone: ''
                }
            })
        })

        it('should handle null delivery address', () => {
            const payer = {
                email_address: 'test@example.com',
                name: {
                    given_name: 'John',
                    surname: 'Doe'
                }
            }

            const result = formatPayPalShopperDetails(payer, null)

            expect(result).toEqual({
                deliveryAddress: null,
                profile: {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: ''
                }
            })
        })

        it('should handle empty payer object', () => {
            const deliveryAddress = {
                city: 'Chicago',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails({}, deliveryAddress)

            expect(result).toEqual({
                deliveryAddress: {
                    city: 'Chicago',
                    country: 'US',
                    postalCode: '',
                    stateOrProvince: '',
                    street: ''
                },
                profile: {
                    email: '',
                    firstName: '',
                    lastName: '',
                    phone: ''
                }
            })
        })

        it('should handle missing payer name', () => {
            const payer = {
                email_address: 'test@example.com'
            }
            const deliveryAddress = {
                city: 'Seattle',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile).toEqual({
                email: 'test@example.com',
                firstName: '',
                lastName: '',
                phone: ''
            })
        })

        it('should handle missing payer phone', () => {
            const payer = {
                email_address: 'test@example.com',
                name: {
                    given_name: 'Jane',
                    surname: 'Smith'
                }
            }
            const deliveryAddress = {
                city: 'Portland',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile).toEqual({
                email: 'test@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
                phone: ''
            })
        })

        it('should handle partial payer name', () => {
            const payer = {
                email_address: 'test@example.com',
                name: {
                    given_name: 'John'
                }
            }
            const deliveryAddress = {
                city: 'Austin',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile).toEqual({
                email: 'test@example.com',
                firstName: 'John',
                lastName: '',
                phone: ''
            })
        })

        it('should handle payer with only surname', () => {
            const payer = {
                email_address: 'test@example.com',
                name: {
                    surname: 'Doe'
                }
            }
            const deliveryAddress = {
                city: 'Denver',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile).toEqual({
                email: 'test@example.com',
                firstName: '',
                lastName: 'Doe',
                phone: ''
            })
        })

        it('should handle nested phone structure with missing national_number', () => {
            const payer = {
                email_address: 'test@example.com',
                name: {
                    given_name: 'John',
                    surname: 'Doe'
                },
                phone: {
                    phone_number: {}
                }
            }
            const deliveryAddress = {
                city: 'Miami',
                countryCode: 'US'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile.phone).toBe('')
        })

        it('should handle international phone number', () => {
            const payer = {
                email_address: 'test@example.com',
                name: {
                    given_name: 'John',
                    surname: 'Doe'
                },
                phone: {
                    phone_number: {
                        national_number: '+44 20 7946 0958'
                    }
                }
            }
            const deliveryAddress = {
                city: 'London',
                countryCode: 'GB'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile.phone).toBe('+44 20 7946 0958')
        })

        it('should handle email with special characters', () => {
            const payer = {
                email_address: 'test+tag@example.co.uk',
                name: {
                    given_name: 'John',
                    surname: 'Doe'
                }
            }
            const deliveryAddress = {
                city: 'Manchester',
                countryCode: 'GB'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile.email).toBe('test+tag@example.co.uk')
        })

        it('should handle names with special characters', () => {
            const payer = {
                email_address: 'test@example.com',
                name: {
                    given_name: 'José',
                    surname: "O'Brien-Smith"
                }
            }
            const deliveryAddress = {
                city: 'Madrid',
                countryCode: 'ES'
            }

            const result = formatPayPalShopperDetails(payer, deliveryAddress)

            expect(result.profile).toEqual({
                email: 'test@example.com',
                firstName: 'José',
                lastName: "O'Brien-Smith",
                phone: ''
            })
        })

        it('should handle both null payer and delivery address', () => {
            const result = formatPayPalShopperDetails(null, null)

            expect(result).toEqual({
                deliveryAddress: null,
                profile: {
                    email: '',
                    firstName: '',
                    lastName: '',
                    phone: ''
                }
            })
        })
    })
})
