import {expireAt} from '../expireAt.mjs'
import {DEFAULT_EXPIRATION_TIME} from '../constants.mjs'

// Mock Date.now() for consistent testing
const MOCK_NOW = 1699862400000 // 2023-11-13T08:00:00.000Z

describe('expireAt', () => {
    let dateNowSpy

    beforeEach(() => {
        // Mock Date.now() to return a fixed timestamp
        dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW)
    })

    afterEach(() => {
        // Restore original Date.now()
        dateNowSpy.mockRestore()
    })

    describe('with valid numeric inputs', () => {
        it('should calculate expiration time with number input', () => {
            const result = expireAt(30)
            const expectedTime = new Date(MOCK_NOW + 30 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
            expect(result).toBe('2023-11-13T08:30:00.000Z')
        })

        it('should calculate expiration time with string number input', () => {
            const result = expireAt('45')
            const expectedTime = new Date(MOCK_NOW + 45 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
            expect(result).toBe('2023-11-13T08:45:00.000Z')
        })

        it('should handle decimal minutes as number', () => {
            const result = expireAt(15.5)
            const expectedTime = new Date(MOCK_NOW + 15.5 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
            expect(result).toBe('2023-11-13T08:15:30.000Z')
        })

        it('should handle decimal minutes as string', () => {
            const result = expireAt('20.5')
            const expectedTime = new Date(MOCK_NOW + 20.5 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
            expect(result).toBe('2023-11-13T08:20:30.000Z')
        })

        it('should handle very large expiration times', () => {
            const result = expireAt(1440) // 24 hours
            const expectedTime = new Date(MOCK_NOW + 1440 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
            expect(result).toBe('2023-11-14T08:00:00.000Z')
        })

        it('should handle very small expiration times', () => {
            const result = expireAt(1)
            const expectedTime = new Date(MOCK_NOW + 1 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
            expect(result).toBe('2023-11-13T08:01:00.000Z')
        })
    })

    describe('with invalid inputs - should use default expiry time', () => {
        const defaultMinutes = Number(DEFAULT_EXPIRATION_TIME)
        const expectedDefaultTime = new Date(MOCK_NOW + defaultMinutes * 60 * 1000).toISOString()

        it('should use default time for null input', () => {
            const result = expireAt(null)
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for undefined input', () => {
            const result = expireAt(undefined)
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for empty string', () => {
            const result = expireAt('')
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for non-numeric string', () => {
            const result = expireAt('invalid')
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for NaN', () => {
            const result = expireAt(NaN)
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for zero', () => {
            const result = expireAt(0)
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for string zero', () => {
            const result = expireAt('0')
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for negative number', () => {
            const result = expireAt(-10)
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for negative string number', () => {
            const result = expireAt('-5')
            expect(result).toBe(expectedDefaultTime)
        })

        it('should treat boolean true as 1 minute (Number(true) = 1)', () => {
            const result = expireAt(true)
            const expectedTime = new Date(MOCK_NOW + 1 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
        })

        it('should use default time for boolean false (Number(false) = 0)', () => {
            const result = expireAt(false)
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for object', () => {
            const result = expireAt({})
            expect(result).toBe(expectedDefaultTime)
        })

        it('should use default time for array', () => {
            const result = expireAt([])
            expect(result).toBe(expectedDefaultTime)
        })
    })

    describe('return value format', () => {
        it('should return ISO 8601 formatted string', () => {
            const result = expireAt(30)
            // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        })

        it('should return a valid date string', () => {
            const result = expireAt(30)
            const date = new Date(result)
            expect(date.toString()).not.toBe('Invalid Date')
        })

        it('should return a future timestamp', () => {
            const result = expireAt(30)
            const expirationDate = new Date(result)
            const now = new Date(MOCK_NOW)
            expect(expirationDate.getTime()).toBeGreaterThan(now.getTime())
        })
    })

    describe('edge cases with whitespace in strings', () => {
        it('should handle string with leading whitespace', () => {
            const result = expireAt('  30')
            const expectedTime = new Date(MOCK_NOW + 30 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
        })

        it('should handle string with trailing whitespace', () => {
            const result = expireAt('30  ')
            const expectedTime = new Date(MOCK_NOW + 30 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
        })

        it('should handle string with both leading and trailing whitespace', () => {
            const result = expireAt('  30  ')
            const expectedTime = new Date(MOCK_NOW + 30 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
        })
    })

    describe('scientific notation', () => {
        it('should handle scientific notation as string', () => {
            const result = expireAt('1e2') // 100
            const expectedTime = new Date(MOCK_NOW + 100 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
        })

        it('should handle scientific notation as number', () => {
            const result = expireAt(1e2) // 100
            const expectedTime = new Date(MOCK_NOW + 100 * 60 * 1000).toISOString()
            expect(result).toBe(expectedTime)
        })
    })
})
