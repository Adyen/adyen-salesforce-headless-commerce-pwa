# Adyen Salesforce PWA

This NPM package enables you to go live fast with payments with Adyen as a payment service provider when building your Salesforce PWA
Retail application.

To request a feature, report a bug, or report a security
vulnerability, [create a GitHub issue](https://github.com/Adyen/adyen-salesforce-headless-commerce-pwa/issues/new/choose).

## Dependencies & Requirements

Adyen Payments Composable Storefront Integration for B2C Commerce depends on:

1. PWA v8
2. [Adyen Web v6.48.0](https://www.npmjs.com/package/@adyen/adyen-web)
3. [Adyen API Library for Node.js v32.0.0](https://www.npmjs.com/package/@adyen/api-library) (supports Checkout API v72)
4. Node v22 or later
5. NPM v11 or later
6. Salesforce Managed Runtime

## Installation

For set-up, installation, and Go-Live instructions, refer to [Adyen Docs](https://docs.adyen.com/plugins/salesforce-commerce-cloud/composable-storefront).
Available payment methods and features can be found on [Adyen Docs](https://docs.adyen.com/plugins/salesforce-commerce-cloud).

## Merchant-provided device fingerprints

Adyen Web includes Risk SDK data in payment requests automatically. If your storefront separately
collects its own device fingerprint, pass the actual value to `AdyenCheckout` through
`paymentRequestData`:

```jsx
<AdyenCheckout paymentRequestData={{deviceFingerprint}} />
```

Do not send an empty or placeholder fingerprint. The integration omits empty values and the
placeholders `N/A` and `ZZ` from the payment request.

## Payment method disclaimer messages

Adyen Web 6.46.0 and later supports a `disclaimerMessage` above the SDK payment button. Pass the
merchant-approved, localized content through `paymentMethodsConfiguration` for every payment
method that requires it:

```jsx
const disclaimerMessage = {
    message: 'By continuing you accept the %{terms}',
    linkText: 'terms and conditions',
    link: 'https://example.com/terms'
}

const paymentMethodsConfiguration = {
    klarna: {disclaimerMessage},
    afterpaytouch: {disclaimerMessage}
}

<AdyenCheckout paymentMethodsConfiguration={paymentMethodsConfiguration} />
```

The message belongs to each payment method configuration, not the top-level Adyen Checkout
configuration. Merchants are responsible for selecting the applicable payment methods and
providing approved content for the shopper's locale. The integration passes the configuration to
Adyen Web, which renders it for available payment methods. Payment methods with branded buttons,
including Apple Pay, Google Pay, PayPal, Amazon Pay, and Cash App Pay, do not display this message.

For regulatory guidance, see
[Revised EU Consumer Credit Directive (CCD2)](https://docs.adyen.com/payment-methods/bnpl-eu-regulations).

For US ecommerce card payments, the server checks the DCAP-required shopper IP, shopper email,
complete billing address, and fingerprint data before calling `/payments`. Adyen Web
`riskData.clientData` or a merchant-provided `deviceFingerprint` satisfies the fingerprint check.
Missing data produces a warning containing field names only; shopper data is never included in the
warning.

## Prerequisites

- [Adyen test account](https://www.adyen.com/signup)
- [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key)
- [Client key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key)

## Support

For other questions, contact our [support team](https://www.adyen.help).

## License

This repository is available under the [MIT license](LICENSE).
