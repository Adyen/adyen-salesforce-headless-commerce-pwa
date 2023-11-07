import {ShopperLogin, ShopperBaskets} from 'commerce-sdk-isomorphic'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import AdyenCheckoutConfig from './checkout-config'

async function setupE2E(req, res) {
    const checkout = AdyenCheckoutConfig.getInstance()

    try {
        const {app: appConfig} = getConfig()
        const shopperBaskets = new ShopperBaskets({
            ...appConfig.commerceAPI,
            headers: {authorization: req.headers.authorization}
        })

        const customerId = req.headers.customerid
        const shopperLoginClientConfig = {
            parameters: {
                clientId: process.env.COMMERCE_API_CLIENT_ID,
                organizationId: process.env.COMMERCE_API_ORG_ID,
                shortCode: process.env.COMMERCE_API_SHORT_CODE,
                siteId: process.env.COMMERCE_API_SITE_ID
            }
        }
        const shopperLoginClient = new ShopperLogin(shopperLoginClientConfig)
        const credentials = `${process.env.COMMERCE_API_CLIENT_ID_PRIVATE}:${process.env.COMMERCE_API_CLIENT_SECRET}`
        const base64data = btoa(credentials)
        const headers = {
            authorization: `Basic ${base64data}`
        }
        const data = await shopperLoginClient.getAccessToken({
            body: {
                grant_type: 'client_credentials'
            },
            headers
        })
        const basket = await shopperBaskets.createBasket({
            body: {
                ...req.body,
                customerInfo: {
                    email: 'test@test.com',
                    customerId: customerId || data.customer_id
                }
            },
            headers: {
                authorization: `Bearer ${data.access_token}`
            }
        })
        res.json(basket)
    } catch (err) {
        res.status(err.statusCode || 500).json(err.message)
    }
}

export default setupE2E
