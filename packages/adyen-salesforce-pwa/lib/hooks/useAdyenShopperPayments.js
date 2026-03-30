import {useQuery} from '@tanstack/react-query'
import {AdyenShopperPaymentsService} from '../services/shopper-payments'
import {adyenKeys} from '../utils/queryKeys'

const useAdyenShopperPayments = ({authToken, customerId, basketId, site, locale, skip = false}) => {
    const query = useQuery({
        queryKey: adyenKeys.shopperPayments(basketId, site?.id, locale?.id),
        queryFn: async () => {
            const adyenShopperPaymentsService = new AdyenShopperPaymentsService(
                authToken,
                customerId,
                basketId,
                site
            )
            return adyenShopperPaymentsService.fetchPaymentConfiguration(locale)
        },
        enabled: !skip && !!authToken
    })

    return {
        isLoading: query.isLoading && query.fetchStatus !== 'idle',
        data: query.data ?? null,
        error: query.error ?? null
    }
}

export default useAdyenShopperPayments
