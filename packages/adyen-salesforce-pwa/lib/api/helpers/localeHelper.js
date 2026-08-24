import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import Logger from '../models/logger'

const isAbsent = (value) =>
    typeof value !== 'string' || !value.trim() || value === 'undefined' || value === 'null'

/**
 * Resolves the locale to forward to the SCAPI Shopper APIs.
 * Returns `undefined` when the request carries no usable locale, so that the SCAPI
 * `locale` parameter is omitted and SFCC keeps applying the site default.
 * An unsupported locale falls back to the site's configured default locale, so a bad
 * value can never break a basket call.
 * @param {string} siteId - The site ID the request belongs to.
 * @param {string} [requestedLocale] - The locale sent by the storefront (e.g. `en-GB`).
 * @returns {string|undefined} The locale to use, or `undefined` to omit it.
 */
export function resolveLocale(siteId, requestedLocale) {
    if (isAbsent(requestedLocale)) {
        return undefined
    }

    const locale = requestedLocale.trim()
    const {app: appConfig} = getConfig() || {}
    const l10n = appConfig?.sites?.find?.((site) => site.id === siteId)?.l10n

    if (!l10n) {
        return locale
    }

    const supportedLocales = (
        Array.isArray(l10n.supportedLocales) ? l10n.supportedLocales : []
    ).map((supported) => (typeof supported === 'string' ? supported : supported?.id))

    if (supportedLocales.includes(locale)) {
        return locale
    }

    Logger.warn(
        'resolveLocale',
        `Locale ${locale} is not supported by site ${siteId}, falling back to ${l10n.defaultLocale}`
    )
    return l10n.defaultLocale
}
