import {useQuery} from '@tanstack/react-query'
import {AdyenPaymentMethodsForExpressService} from '../services/payment-methods-for-express'
import {adyenKeys} from '../utils/queryKeys'

/**
 * A hook for fetching and managing the Adyen payment methods for express checkout (Apple Pay, PayPal).
 * It handles loading, error, and data states internally.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {object} props.site - The site object.
 * @param {object} props.locale - The locale object.
 * @param {string} props.currency - The currency code (e.g., 'USD', 'GBP').
 * @param {object} [props.basket] - Optional basket object containing orderTotal for currencyAmount.
 * @param {boolean} [props.skip] - If true, the fetch will be skipped.
 * @returns {{isLoading: boolean, data: object|null, error: object|null}}
 */
const useAdyenPaymentMethodsForExpress = ({
    authToken,
    customerId,
    site,
    locale,
    currency,
    basket,
    skip = false
}) => {
    const currencyAmount = basket?.orderTotal
    const country = locale?.id?.slice(-2)

    const query = useQuery({
        queryKey: adyenKeys.paymentMethodsExpress(
            site?.id,
            locale?.id,
            currency,
            currencyAmount,
            country
        ),
        queryFn: async () => {
            const adyenPaymentMethodsForExpressService = new AdyenPaymentMethodsForExpressService(
                authToken,
                customerId,
                site
            )
            return adyenPaymentMethodsForExpressService.fetchPaymentMethodsForExpress(
                locale,
                currency
            )
        },
        enabled: !skip && !!authToken && !!currency
    })

    return {
        isLoading: query.isLoading && query.fetchStatus !== 'idle',
        data: query.data ?? null,
        error: query.error ?? null
    }
}

export default useAdyenPaymentMethodsForExpress
