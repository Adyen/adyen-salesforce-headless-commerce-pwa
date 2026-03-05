import {useQuery} from '@tanstack/react-query'
import {AdyenShippingMethodsService} from '../services/shipping-methods'
import {adyenKeys} from '../utils/queryKeys'

/**
 * A hook for fetching and managing the Adyen shipping methods data.
 * It handles loading, error, and data states internally.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {string} props.basketId - The basket ID.
 * @param {object} props.site - The site object.
 * @param {boolean} [props.skip] - If true, the fetch will be skipped.
 * @returns {{isLoading: boolean, data: object|null, error: object|null}}
 */
const useAdyenShippingMethods = ({authToken, customerId, basketId, site, skip = false}) => {
    const query = useQuery({
        queryKey: adyenKeys.shippingMethods(basketId, site?.id),
        queryFn: async () => {
            const adyenShippingMethodsService = new AdyenShippingMethodsService(
                authToken,
                customerId,
                basketId,
                site
            )
            return adyenShippingMethodsService.getShippingMethods()
        },
        enabled: !skip && !!authToken && !!basketId
    })

    return {
        isLoading: query.isLoading,
        data: query.data,
        error: query.error
    }
}

export default useAdyenShippingMethods
