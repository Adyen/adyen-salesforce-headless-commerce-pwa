import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {ShopperCustomers} from 'commerce-sdk-isomorphic'

export function createShopperCustomersClient(authorization) {
    const {app: appConfig} = getConfig()
    return new ShopperCustomers({
        ...appConfig.commerceAPI,
        headers: {authorization}
    })
}

export async function getCustomerBaskets(authorization, customerId) {
    const shopperCustomersClient = createShopperCustomersClient(authorization)
    return await shopperCustomersClient.getCustomerBaskets({
        parameters: {
            customerId: customerId
        }
    })
}
