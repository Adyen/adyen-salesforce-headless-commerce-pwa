import currencyList from './currencyList.mjs'

const INVALID_CURRENCY_ERROR = 'invalid currency!'

// converts the currency value for the Adyen Checkout API
export function getCurrencyValueForApi(amount, currencyCode) {
    const currency = currencyList.find((currency) => currency.Code === currencyCode)
    if (!currency) throw new Error(INVALID_CURRENCY_ERROR)
    return Math.round(amount * Math.pow(10, currency.Decimals))
}
