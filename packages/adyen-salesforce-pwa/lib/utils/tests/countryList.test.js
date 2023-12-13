import countryList from '../countryList.mjs'

describe('Country List', () => {
    it('should export an array of countries', () => {
        expect(Array.isArray(countryList)).toBe(true)
    })

    it('should contain a specific number of countries', () => {
        expect(countryList).toHaveLength(244)
    })
})
