import sites from '../../config/sites'

describe('site localization configuration', () => {
    it('supports Korean locale with KRW currency on each site', () => {
        sites.forEach(({l10n}) => {
            expect(l10n.supportedCurrencies).toContain('KRW')
            expect(l10n.supportedLocales).toContainEqual({
                id: 'ko-KR',
                preferredCurrency: 'KRW'
            })
        })
    })
})
