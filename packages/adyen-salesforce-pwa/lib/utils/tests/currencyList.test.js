import currencyList from '../currencyList.mjs'

describe('Country List', () => {
    it('should export an array of countries', () => {
        expect(Array.isArray(currencyList)).toBe(true)
    })

    it('should contain a specific number of countries', () => {
        expect(currencyList).toHaveLength(139)
    })
})
