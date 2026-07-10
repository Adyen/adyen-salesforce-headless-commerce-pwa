import {generateServiceId} from '../generateServiceId.mjs'

describe('generateServiceId', () => {
    it('should return a string of at most 10 characters', () => {
        for (let i = 0; i < 20; i++) {
            const serviceId = generateServiceId()
            expect(serviceId.length).toBeLessThanOrEqual(10)
        }
    })

    it('should return a non-empty string', () => {
        const serviceId = generateServiceId()
        expect(typeof serviceId).toBe('string')
        expect(serviceId.length).toBeGreaterThan(0)
    })

    it('should generate unique IDs', () => {
        const ids = new Set()
        for (let i = 0; i < 50; i++) {
            ids.add(generateServiceId())
        }
        expect(ids.size).toBeGreaterThan(1)
    })
})
