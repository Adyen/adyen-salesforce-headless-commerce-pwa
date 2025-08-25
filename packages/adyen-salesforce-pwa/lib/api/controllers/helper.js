import {getConfig} from "@salesforce/pwa-kit-runtime/utils/ssr-config";
import {ShopperBaskets} from "commerce-sdk-isomorphic";

export async function saveToBasket(req, basketId, data) {
    const {app: appConfig} = getConfig()
    const shopperBaskets = new ShopperBaskets({
        ...appConfig.commerceAPI,
        headers: {authorization: req.headers.authorization}
    })
    const request = {
        body: data,
        parameters: {
            basketId: basketId
        }
    }
    return await shopperBaskets.updateBasket(request)
}