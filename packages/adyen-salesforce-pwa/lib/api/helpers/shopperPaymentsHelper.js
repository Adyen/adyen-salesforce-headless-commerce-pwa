import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ShopperPayments} from 'commerce-sdk-isomorphic'

export function createShopperPaymentsClient(authorization, siteId) {
    const {app: appConfig} = getConfig()
    return new ShopperPayments({
        ...appConfig.commerceAPI,
        parameters: {
            ...appConfig.commerceAPI.parameters,
            siteId: siteId || appConfig.commerceAPI.parameters.siteId
        },
        headers: {authorization},
        throwOnBadResponse: true
    })
}

export async function getPaymentConfiguration(authorization, siteId, currency, countryCode) {
    const shopperPayments = createShopperPaymentsClient(authorization, siteId)
    return shopperPayments.getPaymentConfiguration({
        parameters: {
            currency,
            ...(countryCode && {countryCode})
        }
    })
}
