# Adyen Salesforce PWA

This npm package provides the opportunity to use Adyen as a payment service provider when building your Salesforce PWA
application.

---
**NOTE**

This version is in beta and may not be suitable for production use.
We anticipate the general availability solution to be ready by Q1 2024.

Please be aware that the beta version is not supported by Adyen until general availability, will not be providing
technical support for this specific beta release.

We encourage users to explore the package, provide feedback, and report any issues via
our [GitHub repository](https://github.com/Adyen/adyen-salesforce-headless-commerce-pwa.git).

---

## Dependencies & Requirements

Adyen Payments Composable Storefront Integration for B2C Commerce depends on:

1. PWA v3.1.1
2. Adyen Web Components v5.51.0
3. Adyen API Library for Node.js v14.3.0
4. Node v18 or later
5. NPM v9 or later
6. Salesforce Managed Runtime

## Installation

1. Install the npm package using the following command
    ```shell
    npm install @adyen/adyen-salesforce-pwa
    ```

2. Import the Adyen endpoints function in the `ssr.js` file:
    ```ecmascript 6
    import {registerAdyenEndpoints} from '@adyen/adyen-salesforce-pwa/dist/ssr/index.js'
    ```

3. Include it as part of the server handler callback in the `ssr.js` file before last `app.get()` handler:

    ```ecmascript 6
    const {handler} = runtime.createHandler(options, (app) => {
      // ...

      registerAdyenEndpoints(app, runtime)

      app.get('*', runtime.render)
    })
    ```

4. Include Adyen checkout pages in the `routes.jsx` of your `retail-react-app`.
   Check [routes.jsx](../adyen-retail-react-app/overrides/app/routes.jsx) file for reference.

5. In your `retail-react-app` you would need to create a .env file. Check
   the [example file](../adyen-retail-react-app/.env.example) in our reference application.

6. In your `retail-react-app` you would need to create the `config/{siteId}/adyen.js` file and include the adyen config.
   Your `config/{siteId}/adyen.js` file should look something similar to this:

    ```ecmascript 5
    module.exports = {
        apiKey: process.env.ADYEN_API_KEY,
        clientKey: process.env.ADYEN_CLIENT_KEY,
        environment: process.env.ADYEN_ENVIRONMENT,
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        systemIntegratorName: process.env.SYSTEM_INTEGRATOR_NAME,
        webhookUser: process.env.ADYEN_WEBHOOK_USER,
        webhookPassword: process.env.ADYEN_WEBHOOK_PASSWORD,
        webhookHmacKey: process.env.ADYEN_HMAC_KEY
    }
   ```

7. Import `countrylist` in `constants.js` of your `retail-react-app` and export it as `SHIPPING_COUNTRY_CODES`:

    ```ecmascript 6
   import {countryList} from '@adyen/adyen-salesforce-pwa'

   export const SHIPPING_COUNTRY_CODES = countryList
    ```

8. To run the app locally with env variables execute the following command:
    ```shell
    npm run start:env
    ```

9. To push your env variables to the MRT environment execute the following command:
    ```shell
    npm run upload-env
    ```

10. To see which env variables are present in the MRT environment execute the following command:
    ```shell
    npm run get-env
    ```

## Prerequisites

* [Adyen test account](https://www.adyen.com/signup)
* [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key)
* [Client key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key)

## Support

To request a feature, report a bug, or report a security
vulnerability, [create a GitHub issue](https://github.com/Adyen/adyen-salesforce-headless-commerce-pwa/issues/new/choose).

For other questions, contact our [support team](https://www.adyen.help).

## License

This repository is available under the [MIT license](LICENSE).
