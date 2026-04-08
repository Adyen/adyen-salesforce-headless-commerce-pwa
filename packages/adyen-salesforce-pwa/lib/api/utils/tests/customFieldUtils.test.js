import {mapCustomFields} from '../customFieldUtils.js'

describe('customFieldUtils', () => {
    describe('mapCustomFields', () => {
        it('should return empty object when customFields is empty array', () => {
            const result = mapCustomFields([])
            expect(result).toEqual({})
        })

        it('should return empty object when customFields is undefined', () => {
            const result = mapCustomFields(undefined)
            expect(result).toEqual({})
        })

        it('should return empty object when customFields is not provided', () => {
            const result = mapCustomFields()
            expect(result).toEqual({})
        })

        it('should map field and value to object', () => {
            const customFields = [{field: 'pspReference', value: 'ABC123'}]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({pspReference: 'ABC123'})
        })

        it('should map multiple fields', () => {
            const customFields = [
                {field: 'pspReference', value: 'ABC123'},
                {field: 'installments', value: 3}
            ]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({
                pspReference: 'ABC123',
                installments: 3
            })
        })

        it('should skip entries with missing field', () => {
            const customFields = [
                {field: 'pspReference', value: 'ABC123'},
                {value: 'missing field'},
                {field: 'installments', value: 3}
            ]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({
                pspReference: 'ABC123',
                installments: 3
            })
        })

        it('should skip entries with null value', () => {
            const customFields = [
                {field: 'pspReference', value: 'ABC123'},
                {field: 'nullField', value: null},
                {field: 'installments', value: 3}
            ]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({
                pspReference: 'ABC123',
                installments: 3
            })
        })

        it('should skip entries with undefined value', () => {
            const customFields = [
                {field: 'pspReference', value: 'ABC123'},
                {field: 'undefinedField', value: undefined},
                {field: 'installments', value: 3}
            ]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({
                pspReference: 'ABC123',
                installments: 3
            })
        })

        it('should allow falsy values that are not null or undefined', () => {
            const customFields = [
                {field: 'zero', value: 0},
                {field: 'false', value: false},
                {field: 'emptyString', value: ''}
            ]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({
                zero: 0,
                false: false,
                emptyString: ''
            })
        })

        it('should handle array values', () => {
            const customFields = [{field: 'items', value: ['a', 'b', 'c']}]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({items: ['a', 'b', 'c']})
        })

        it('should handle object values', () => {
            const customFields = [{field: 'metadata', value: {key: 'value'}}]
            const result = mapCustomFields(customFields)
            expect(result).toEqual({metadata: {key: 'value'}})
        })
    })
})
