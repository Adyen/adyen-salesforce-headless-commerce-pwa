import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'

export const getAdyenConfigForCurrentSite = () => {
  const {app: appConfig} = getConfig()
  const currentSiteId = appConfig.commerceAPI.parameters.siteId
  return appConfig.sites.find((site) => site.id === currentSiteId)?.adyen
}