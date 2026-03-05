import {useQuery} from '@tanstack/react-query'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {adyenKeys} from '../utils/queryKeys'

/**
 * A hook for fetching and managing the Adyen payment methods data.
 * It handles loading, error, and data states internally.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {string} props.basketId - The basket ID.
 * @param {object} props.site - The site object.
 * @param {object} props.locale - The locale object.
 * @param {object} props.basket - The basket object containing currency and orderTotal.
 * @param {boolean} [props.skip] - If true, the fetch will be skipped.
 * @returns {{isLoading: boolean, data: object|null, error: object|null}}
 */
const useAdyenPaymentMethods = ({
    authToken,
    customerId,
    basketId,
    site,
    locale,
    basket,
    skip = false
}) => {
    const currencyAmount = basket?.orderTotal
    const country = locale?.id?.slice(-2)

    const query = useQuery({
        queryKey: adyenKeys.paymentMethods(basketId, site?.id, locale?.id, currencyAmount, country),
        queryFn: async () => {
            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(
                authToken,
                customerId,
                basketId,
                site
            )
            return adyenPaymentMethodsService.fetchPaymentMethods(locale)
        },
        enabled: !skip && !!authToken
    })

    return {
        isLoading: query.isLoading,
        data: query.data,
        error: query.error
    }
}

export default useAdyenPaymentMethods
