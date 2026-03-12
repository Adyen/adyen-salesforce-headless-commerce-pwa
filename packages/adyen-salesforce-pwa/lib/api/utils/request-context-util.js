import {AsyncLocalStorage} from 'node:async_hooks'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'

const requestStore = new AsyncLocalStorage()

export const RequestContext = {
    /**
     * Set the context for the current request
     */
    set: (data, callback) => requestStore.run(data, callback),

    get adyenContext() {
        return requestStore.getStore() || {}
    },

    get siteId() {
        const defaultSiteId = getConfig().app.commerceAPI.parameters.siteId
        return this.adyenContext?.siteId || defaultSiteId
    }
}
