import {resolveLocale} from '../localeHelper.js'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import Logger from '../../models/logger'

jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => ({
    getConfig: jest.fn()
}))

jest.mock('../../models/logger')

const mockSitesConfig = (sites) => getConfig.mockReturnValue({app: {sites}})

describe('resolveLocale', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockSitesConfig([
            {
                id: 'RefArch',
                l10n: {
                    defaultLocale: 'en-US',
                    supportedLocales: [{id: 'en-US'}, {id: 'en-GB'}]
                }
            }
        ])
    })

    it('returns the requested locale when the site supports it', () => {
        expect(resolveLocale('RefArch', 'en-GB')).toBe('en-GB')
        expect(Logger.warn).not.toHaveBeenCalled()
    })

    it('supports locales configured as plain strings', () => {
        mockSitesConfig([
            {id: 'RefArch', l10n: {defaultLocale: 'en-US', supportedLocales: ['en-US', 'ja-JP']}}
        ])

        expect(resolveLocale('RefArch', 'ja-JP')).toBe('ja-JP')
    })

    it('trims the requested locale', () => {
        expect(resolveLocale('RefArch', ' en-GB ')).toBe('en-GB')
    })

    it('falls back to the site default locale and warns for an unsupported locale', () => {
        expect(resolveLocale('RefArch', 'fr-FR')).toBe('en-US')
        expect(Logger.warn).toHaveBeenCalledWith(
            'resolveLocale',
            'Locale fr-FR is not supported by site RefArch, falling back to en-US'
        )
    })

    it.each([[undefined], [null], [''], ['   '], ['undefined'], ['null'], [['en-GB', 'en-US']]])(
        'returns undefined for an absent locale value: %p',
        (value) => {
            expect(resolveLocale('RefArch', value)).toBeUndefined()
            expect(getConfig).not.toHaveBeenCalled()
        }
    )

    it('returns the requested locale unchanged when the site has no l10n config', () => {
        mockSitesConfig([{id: 'RefArch'}])

        expect(resolveLocale('RefArch', 'fr-FR')).toBe('fr-FR')
    })

    it('returns the requested locale unchanged when the site is not in the config', () => {
        expect(resolveLocale('UnknownSite', 'fr-FR')).toBe('fr-FR')
    })

    it('returns the requested locale unchanged when no sites are configured', () => {
        getConfig.mockReturnValue({})

        expect(resolveLocale('RefArch', 'fr-FR')).toBe('fr-FR')
    })

    it('falls back to the site default locale when the site lists no supported locales', () => {
        mockSitesConfig([{id: 'RefArch', l10n: {defaultLocale: 'en-US'}}])

        expect(resolveLocale('RefArch', 'en-GB')).toBe('en-US')
    })

    it('returns undefined when an unsupported locale is given and the site has no default locale', () => {
        mockSitesConfig([{id: 'RefArch', l10n: {supportedLocales: [{id: 'en-US'}]}}])

        expect(resolveLocale('RefArch', 'fr-FR')).toBeUndefined()
    })

    it('returns the requested locale unchanged when getConfig returns nothing', () => {
        getConfig.mockReturnValue(undefined)

        expect(resolveLocale('RefArch', 'fr-FR')).toBe('fr-FR')
    })

    it('returns the requested locale unchanged when sites is misconfigured as a non-array', () => {
        getConfig.mockReturnValue({app: {sites: {RefArch: {}}}})

        expect(resolveLocale('RefArch', 'fr-FR')).toBe('fr-FR')
    })

    it('falls back to the site default locale when supportedLocales is misconfigured as a non-array', () => {
        mockSitesConfig([
            {id: 'RefArch', l10n: {defaultLocale: 'en-US', supportedLocales: 'en-US'}}
        ])

        expect(resolveLocale('RefArch', 'en-GB')).toBe('en-US')
    })
})
