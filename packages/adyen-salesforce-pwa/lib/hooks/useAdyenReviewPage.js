import {useCallback, useState} from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {AdyenPaymentDataReviewPageService} from '../services/payment-data-review-page'
import {AdyenPaymentsDetailsService} from '../services/payments-details'
import {adyenKeys} from '../utils/queryKeys'

/**
 * A hook for managing the Adyen review page functionality.
 * Handles fetching payment data and submitting payment details.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {string} props.basketId - The basket ID.
 * @param {object} props.site - The site object.
 * @param {boolean} [props.skip] - If true, the initial fetch will be skipped.
 * @returns {{
 *   isLoading: boolean,
 *   isSubmitting: boolean,
 *   paymentData: object|null,
 *   error: object|null,
 *   submitPaymentDetails: function,
 *   refetch: function
 * }}
 */
const useAdyenReviewPage = ({authToken, customerId, basketId, site, skip = false}) => {
    useQueryClient()
    const [mutationError, setMutationError] = useState(null)

    const query = useQuery({
        queryKey: adyenKeys.paymentData(basketId, site?.id),
        queryFn: async () => {
            const paymentDataService = new AdyenPaymentDataReviewPageService(
                authToken,
                customerId,
                basketId,
                site
            )
            return paymentDataService.getPaymentData()
        },
        enabled: !skip && !!authToken && !!basketId
    })

    const mutation = useMutation({
        mutationFn: async (data) => {
            const paymentsDetailsService = new AdyenPaymentsDetailsService(
                authToken,
                customerId,
                basketId,
                site
            )
            return paymentsDetailsService.submitPaymentsDetails(data)
        }
    })

    /**
     * Submits payment details to complete the order.
     * @param {object} [data] - Optional payment data to submit. If not provided, uses the fetched paymentData.
     * @returns {Promise<object>} The payment details response.
     */
    const submitPaymentDetails = useCallback(
        async (data = null) => {
            const dataToSubmit = data || query.data
            if (!dataToSubmit) {
                throw new Error('No payment data available')
            }

            try {
                return await mutation.mutateAsync(dataToSubmit)
            } catch (err) {
                setMutationError(err)
                throw err
            }
        },
        [mutation, query.data]
    )

    return {
        isLoading: query.isLoading && query.fetchStatus !== 'idle',
        isSubmitting: mutation.isLoading,
        paymentData: query.data ?? null,
        error: query.error ?? mutationError ?? null,
        submitPaymentDetails,
        refetch: query.refetch
    }
}

export default useAdyenReviewPage
