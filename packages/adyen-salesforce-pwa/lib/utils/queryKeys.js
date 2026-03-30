export const adyenKeys = {
    environment: (basketId, siteId) => ['adyen', 'environment', basketId, siteId],
    paymentMethods: (basketId, siteId, localeId, currencyAmount, country) => [
        'adyen',
        'paymentMethods',
        basketId,
        siteId,
        localeId,
        currencyAmount,
        country
    ],
    paymentMethodsExpress: (siteId, localeId, currency, currencyAmount, country) => [
        'adyen',
        'paymentMethodsExpress',
        siteId,
        localeId,
        currency,
        currencyAmount,
        country
    ],
    shippingMethods: (basketId, siteId) => ['adyen', 'shippingMethods', basketId, siteId],
    orderNumber: (basketId, siteId) => ['adyen', 'orderNumber', basketId, siteId],
    paymentData: (basketId, siteId) => ['adyen', 'paymentData', basketId, siteId],
    shopperPayments: (basketId, siteId, localeId) => [
        'adyen',
        'shopperPayments',
        basketId,
        siteId,
        localeId
    ]
}
