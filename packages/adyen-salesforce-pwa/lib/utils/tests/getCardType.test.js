import {getCardType} from '../getCardType.mjs'

describe('getCardType', () => {
    it('should return "Visa" for visa', () => {
        expect(getCardType('visa')).toBe('Visa')
    })

    it('should return "Visa" for visa_applepay', () => {
        expect(getCardType('visa_applepay')).toBe('Visa')
    })

    it('should return "Master Card" for mc', () => {
        expect(getCardType('mc')).toBe('Master Card')
    })

    it('should return "Master Card" for mc_applepay', () => {
        expect(getCardType('mc_applepay')).toBe('Master Card')
    })

    it('should return "Amex" for amex', () => {
        expect(getCardType('amex')).toBe('Amex')
    })

    it('should return "Amex" for amex_applepay', () => {
        expect(getCardType('amex_applepay')).toBe('Amex')
    })

    it('should return "Discover" for discover', () => {
        expect(getCardType('discover')).toBe('Discover')
    })

    it('should return "Discover" for discover_applepay', () => {
        expect(getCardType('discover_applepay')).toBe('Discover')
    })

    it('should return "Maestro" for maestro', () => {
        expect(getCardType('maestro')).toBe('Maestro')
    })

    it('should return "Maestro" for maestrouk', () => {
        expect(getCardType('maestrouk')).toBe('Maestro')
    })

    it('should return "Maestro" for maestro_applepay', () => {
        expect(getCardType('maestro_applepay')).toBe('Maestro')
    })

    it('should return "Diners" for diners', () => {
        expect(getCardType('diners')).toBe('Diners')
    })

    it('should return "Diners" for diners_applepay', () => {
        expect(getCardType('diners_applepay')).toBe('Diners')
    })

    it('should return "Bancontact" for bcmc', () => {
        expect(getCardType('bcmc')).toBe('Bancontact')
    })

    it('should return "JCB" for jcb', () => {
        expect(getCardType('jcb')).toBe('JCB')
    })

    it('should return "JCB" for jcb_applepay', () => {
        expect(getCardType('jcb_applepay')).toBe('JCB')
    })

    it('should return "CUP" for cup', () => {
        expect(getCardType('cup')).toBe('CUP')
    })

    it('should return "Carte Bancaire" for cartebancaire', () => {
        expect(getCardType('cartebancaire')).toBe('Carte Bancaire')
    })

    it('should return "Carte Bancaire" for cartebancaire_applepay', () => {
        expect(getCardType('cartebancaire_applepay')).toBe('Carte Bancaire')
    })

    it('should return empty string for unknown card type', () => {
        expect(getCardType('unknown')).toBe('')
    })

    it('should return empty string for empty string input', () => {
        expect(getCardType('')).toBe('')
    })

    it('should return empty string for undefined input', () => {
        expect(getCardType(undefined)).toBe('')
    })
})
