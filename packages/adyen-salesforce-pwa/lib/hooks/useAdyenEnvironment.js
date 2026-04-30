import {useQuery} from '@tanstack/react-query'
import {AdyenEnvironmentService} from '../services/environment'
import {adyenKeys} from '../utils/queryKeys'

/**
 * A hook for fetching and managing the Adyen environment data.
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
const useAdyenEnvironment = ({authToken, customerId, basketId, site, skip = false}) => {
    const query = useQuery({
        queryKey: adyenKeys.environment(basketId, site?.id),
        queryFn: async () => {
            const adyenEnvironmentService = new AdyenEnvironmentService(
                authToken,
                customerId,
                basketId,
                site
            )
            return adyenEnvironmentService.fetchEnvironment()
        },
        enabled: !skip && !!authToken
    })

    return {
        isLoading: query.isLoading && query.fetchStatus !== 'idle',
        data: query.data ?? null,
        error: query.error ?? null
    }
}

export default useAdyenEnvironment
