import {formatAndValidatePaymentRequest} from '../checkoutV72Validation'
import {AdyenError} from '../../models/AdyenError'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

describe('checkoutV72Validation', () => {
    describe('formatAndValidatePaymentRequest', () => {
        describe('validates hard-format fields (throws on failure)', () => {
            describe('shopperEmail validation', () => {
                it('should throw AdyenError for email with spaces', () => {
                    const paymentRequest = {shopperEmail: 'test @example.com'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        ERROR_MESSAGE.INVALID_EMAIL
                    )
                })

                it('should throw AdyenError for email without @', () => {
                    const paymentRequest = {shopperEmail: 'testexample.com'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should throw AdyenError for email with multiple @', () => {
                    const paymentRequest = {shopperEmail: 'test@@example.com'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should throw AdyenError for email starting with @', () => {
                    const paymentRequest = {shopperEmail: '@example.com'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should throw AdyenError for email ending with @', () => {
                    const paymentRequest = {shopperEmail: 'test@'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should throw AdyenError for email with domain starting with dot', () => {
                    const paymentRequest = {shopperEmail: 'test@.example.com'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should throw AdyenError for email longer than 256 characters', () => {
                    const paymentRequest = {shopperEmail: 'a'.repeat(250) + '@example.com'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should pass for valid email', () => {
                    const paymentRequest = {shopperEmail: 'test@example.com'}

                    const result = formatAndValidatePaymentRequest(paymentRequest)

                    expect(result.shopperEmail).toBe('test@example.com')
                })

                it('should pass when shopperEmail is not present', () => {
                    const paymentRequest = {reference: 'test-ref'}

                    const result = formatAndValidatePaymentRequest(paymentRequest)

                    expect(result).toEqual({reference: 'test-ref'})
                })
            })

            describe('dateOfBirth validation', () => {
                it('should throw AdyenError for invalid date format', () => {
                    const paymentRequest = {dateOfBirth: '01/01/2000'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        ERROR_MESSAGE.INVALID_DATE_OF_BIRTH
                    )
                })

                it('should throw AdyenError for date without leading zeros', () => {
                    const paymentRequest = {dateOfBirth: '2000-1-1'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should throw AdyenError for date with invalid separator', () => {
                    const paymentRequest = {dateOfBirth: '2000/01/01'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                })

                it('should pass for valid ISO-8601 date', () => {
                    const paymentRequest = {dateOfBirth: '2000-01-01'}

                    const result = formatAndValidatePaymentRequest(paymentRequest)

                    expect(result.dateOfBirth).toBe('2000-01-01')
                })

                it('should pass when dateOfBirth is not present', () => {
                    const paymentRequest = {reference: 'test-ref'}

                    const result = formatAndValidatePaymentRequest(paymentRequest)

                    expect(result).toEqual({reference: 'test-ref'})
                })
            })

            describe('entityType validation', () => {
                it('should throw AdyenError for invalid entityType', () => {
                    const paymentRequest = {entityType: 'InvalidType'}

                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        AdyenError
                    )
                    expect(() => formatAndValidatePaymentRequest(paymentRequest)).toThrow(
                        ERROR_MESSAGE.INVALID_ENTITY_TYPE
                    )
                })

                it('should pass for NaturalPerson entityType', () => {
                    const paymentRequest = {entityType: 'NaturalPerson'}

                    const result = formatAndValidatePaymentRequest(paymentRequest)

                    expect(result.entityType).toBe('NaturalPerson')
                })

                it('should pass for CompanyName entityType', () => {
                    const paymentRequest = {entityType: 'CompanyName'}

                    const result = formatAndValidatePaymentRequest(paymentRequest)

                    expect(result.entityType).toBe('CompanyName')
                })

                it('should pass when entityType is not present', () => {
                    const paymentRequest = {reference: 'test-ref'}

                    const result = formatAndValidatePaymentRequest(paymentRequest)

                    expect(result).toEqual({reference: 'test-ref'})
                })
            })
        })

        describe('formats length-limited fields (silently truncates)', () => {
            it('should truncate reference to 80 characters', () => {
                const paymentRequest = {reference: 'a'.repeat(100)}

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.reference).toBe('a'.repeat(80))
            })

            it('should truncate shopperIP to 256 characters', () => {
                const paymentRequest = {shopperIP: 'a'.repeat(300)}

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.shopperIP).toBe('a'.repeat(256))
            })

            it('should truncate telephoneNumber to 64 characters', () => {
                const paymentRequest = {telephoneNumber: '1'.repeat(100)}

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.telephoneNumber).toBe('1'.repeat(64))
            })

            it('should truncate socialSecurityNumber to 50 characters', () => {
                const paymentRequest = {socialSecurityNumber: '1'.repeat(100)}

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.socialSecurityNumber).toBe('1'.repeat(50))
            })

            it('should truncate shopperName.firstName to 100 characters', () => {
                const paymentRequest = {
                    shopperName: {
                        firstName: 'a'.repeat(150),
                        lastName: 'Smith'
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.shopperName.firstName).toBe('a'.repeat(100))
                expect(result.shopperName.lastName).toBe('Smith')
            })

            it('should truncate shopperName.lastName to 100 characters', () => {
                const paymentRequest = {
                    shopperName: {
                        firstName: 'John',
                        lastName: 'b'.repeat(150)
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.shopperName.firstName).toBe('John')
                expect(result.shopperName.lastName).toBe('b'.repeat(100))
            })

            it('should truncate billingAddress.postalCode to 10 characters', () => {
                const paymentRequest = {
                    billingAddress: {
                        postalCode: '1'.repeat(20),
                        city: 'Amsterdam'
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.billingAddress.postalCode).toBe('1'.repeat(10))
            })

            it('should truncate billingAddress.stateOrProvince to 10 characters', () => {
                const paymentRequest = {
                    billingAddress: {
                        stateOrProvince: 'a'.repeat(20)
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.billingAddress.stateOrProvince).toBe('a'.repeat(10))
            })

            it('should truncate deliveryAddress.postalCode to 10 characters', () => {
                const paymentRequest = {
                    deliveryAddress: {
                        postalCode: '1'.repeat(20),
                        city: 'Amsterdam'
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.deliveryAddress.postalCode).toBe('1'.repeat(10))
            })

            it('should uppercase and truncate deliveryAddress.stateOrProvince to 2 characters', () => {
                const paymentRequest = {
                    deliveryAddress: {
                        stateOrProvince: 'california'
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.deliveryAddress.stateOrProvince).toBe('CA')
            })

            it('should encode non-ASCII and truncate returnUrl to 1024 characters', () => {
                const paymentRequest = {
                    returnUrl: 'https://example.com/callback?param=' + 'é'.repeat(500)
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.returnUrl.length).toBeLessThanOrEqual(1024)
                expect(result.returnUrl).toContain('%C3%A9')
            })

            it('should truncate returnUrl without non-ASCII to 1024 characters', () => {
                const paymentRequest = {
                    returnUrl: 'https://example.com/' + 'a'.repeat(1500)
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.returnUrl).toBe(
                    ('https://example.com/' + 'a'.repeat(1500)).substring(0, 1024)
                )
            })

            it('should truncate metadata keys to 20 and values to 80 characters', () => {
                const paymentRequest = {
                    metadata: {
                        ['key'.repeat(10)]: 'value'.repeat(30),
                        shortKey: 'shortValue'
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(Object.keys(result.metadata)[0]).toBe('key'.repeat(10).substring(0, 20))
                expect(Object.values(result.metadata)[0]).toBe('value'.repeat(30).substring(0, 80))
                expect(result.metadata.shortKey).toBe('shortValue')
            })

            it('should clamp captureDelayHours to 672', () => {
                const paymentRequest = {
                    captureDelayHours: 1000
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.captureDelayHours).toBe(672)
            })

            it('should not modify captureDelayHours if less than or equal to 672', () => {
                const paymentRequest = {
                    captureDelayHours: 500
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.captureDelayHours).toBe(500)
            })
        })

        describe('edge cases', () => {
            it('should return the input if paymentRequest is null', () => {
                const result = formatAndValidatePaymentRequest(null)

                expect(result).toBeNull()
            })

            it('should return the input if paymentRequest is undefined', () => {
                const result = formatAndValidatePaymentRequest(undefined)

                expect(result).toBeUndefined()
            })

            it('should return the input if paymentRequest is not an object', () => {
                const result = formatAndValidatePaymentRequest('not-an-object')

                expect(result).toBe('not-an-object')
            })

            it('should handle empty paymentRequest object', () => {
                const paymentRequest = {}

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result).toEqual({})
            })

            it('should not mutate the original paymentRequest object', () => {
                const paymentRequest = {
                    reference: 'a'.repeat(100),
                    shopperEmail: 'test@example.com'
                }
                const originalRef = paymentRequest.reference

                formatAndValidatePaymentRequest(paymentRequest)

                expect(paymentRequest.reference).toBe(originalRef)
            })

            it('should handle paymentRequest with all fields', () => {
                const paymentRequest = {
                    reference: 'REF123',
                    shopperEmail: 'test@example.com',
                    dateOfBirth: '1990-01-01',
                    entityType: 'NaturalPerson',
                    shopperIP: '192.168.1.1',
                    telephoneNumber: '+31612345678',
                    socialSecurityNumber: '123-45-6789',
                    shopperName: {
                        firstName: 'John',
                        lastName: 'Doe'
                    },
                    billingAddress: {
                        postalCode: '12345',
                        stateOrProvince: 'NY'
                    },
                    deliveryAddress: {
                        postalCode: '54321',
                        stateOrProvince: 'ca'
                    },
                    returnUrl: 'https://example.com/callback',
                    metadata: {
                        key1: 'value1'
                    },
                    captureDelayHours: 24
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result).toEqual({
                    reference: 'REF123',
                    shopperEmail: 'test@example.com',
                    dateOfBirth: '1990-01-01',
                    entityType: 'NaturalPerson',
                    shopperIP: '192.168.1.1',
                    telephoneNumber: '+31612345678',
                    socialSecurityNumber: '123-45-6789',
                    shopperName: {
                        firstName: 'John',
                        lastName: 'Doe'
                    },
                    billingAddress: {
                        postalCode: '12345',
                        stateOrProvince: 'NY'
                    },
                    deliveryAddress: {
                        postalCode: '54321',
                        stateOrProvince: 'CA'
                    },
                    returnUrl: 'https://example.com/callback',
                    metadata: {
                        key1: 'value1'
                    },
                    captureDelayHours: 24
                })
            })

            it('should handle shopperName that is not an object', () => {
                const paymentRequest = {
                    shopperName: 'not-an-object'
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.shopperName).toBe('not-an-object')
            })

            it('should handle billingAddress that is not an object', () => {
                const paymentRequest = {
                    billingAddress: 'not-an-object'
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.billingAddress).toBe('not-an-object')
            })

            it('should handle deliveryAddress that is not an object', () => {
                const paymentRequest = {
                    deliveryAddress: 'not-an-object'
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.deliveryAddress).toBe('not-an-object')
            })

            it('should handle metadata that is not an object', () => {
                const paymentRequest = {
                    metadata: 'not-an-object'
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.metadata).toBe('not-an-object')
            })

            it('should handle metadata with non-string values', () => {
                const paymentRequest = {
                    metadata: {
                        numberKey: 123,
                        booleanKey: true
                    }
                }

                const result = formatAndValidatePaymentRequest(paymentRequest)

                expect(result.metadata.numberKey).toBe(123)
                expect(result.metadata.booleanKey).toBe(true)
            })
        })
    })
})
