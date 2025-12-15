import {useCallback, useEffect, useState} from 'react'
import {AdyenPaymentDataReviewPageService} from '../services/payment-data-review-page'
import {AdyenPaymentsDetailsService} from '../services/payments-details'

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
    const [isLoading, setIsLoading] = useState(!skip)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [paymentData, setPaymentData] = useState(null)
    const [error, setError] = useState(null)

    const fetchPaymentData = useCallback(async () => {
        if (!authToken || !basketId) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const paymentDataService = new AdyenPaymentDataReviewPageService(
                authToken,
                customerId,
                basketId,
                site
            )
            const data = await paymentDataService.getPaymentData()
            setPaymentData(data)
        } catch (err) {
            setError(err)
        } finally {
            setIsLoading(false)
        }
    }, [authToken, customerId, basketId, site?.id])

    useEffect(() => {
        if (!skip) {
            fetchPaymentData()
        }
    }, [fetchPaymentData, skip])

    /**
     * Submits payment details to complete the order.
     * @param {object} [data] - Optional payment data to submit. If not provided, uses the fetched paymentData.
     * @returns {Promise<object>} The payment details response.
     */
    const submitPaymentDetails = useCallback(
        async (data = null) => {
            const dataToSubmit = data || paymentData
            if (!dataToSubmit) {
                throw new Error('No payment data available')
            }

            setIsSubmitting(true)
            setError(null)

            try {
                const paymentsDetailsService = new AdyenPaymentsDetailsService(
                    authToken,
                    customerId,
                    basketId,
                    site
                )
                const response = await paymentsDetailsService.submitPaymentsDetails(dataToSubmit)
                return response
            } catch (err) {
                setError(err)
                throw err
            } finally {
                setIsSubmitting(false)
            }
        },
        [authToken, customerId, basketId, site?.id, paymentData]
    )

    return {
        isLoading,
        isSubmitting,
        paymentData,
        error,
        submitPaymentDetails,
        refetch: fetchPaymentData
    }
}

export default useAdyenReviewPage
