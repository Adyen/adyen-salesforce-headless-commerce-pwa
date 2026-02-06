import {useCallback, useEffect, useRef, useState} from 'react'
import {PaymentCancelService} from '../services/payment-cancel'

/**
 * Configuration options for the useHandleBackNavigation hook.
 * @typedef {Object} UseHandleBackNavigationConfig
 * @property {string} authToken - The authentication token.
 * @property {string} customerId - The customer ID.
 * @property {string} basketId - The basket ID.
 * @property {object} site - The site configuration object.
 * @property {function} refetchBasket - Function to refetch the basket data.
 * @property {string[]} [paymentDataFields=['c_paymentData', 'c_pspReference']] - Basket fields that indicate active payment data.
 * @property {string[]} [redirectParams=['redirectResult', 'sessionId']] - URL params that indicate a valid redirect return.
 * @property {boolean} [enabled=true] - Whether detection is enabled.
 */

/**
 * A hook for detecting and cleaning up abandoned payment sessions.
 * Handles browser back button navigation and bfcache restoration scenarios.
 *
 * The hook automatically listens for bfcache restoration (pageshow event with persisted=true)
 * and checks for abandoned payments. When detected, it cancels the payment and reloads the page.
 *
 * @param {UseHandleBackNavigationConfig} config - Configuration options.
 * @returns {{
 *   error: Error|null,
 *   checkForAbandonedPayment: () => Promise<boolean>
 * }} Returns error state and a function to manually check for abandoned payments.
 *
 * @example
 * const {error, checkForAbandonedPayment} = useHandleBackNavigation({
 *   authToken,
 *   customerId,
 *   basketId: basket?.basketId,
 *   site,
 *   refetchBasket
 * })
 */
const useHandleBackNavigation = ({
    authToken,
    customerId,
    basketId,
    site,
    refetchBasket,
    paymentDataFields = ['c_paymentData', 'c_pspReference'],
    redirectParams = ['redirectResult', 'sessionId'],
    enabled = true
}) => {
    const [error, setError] = useState(null)
    const hasDetectedRef = useRef(false)
    const isProcessingRef = useRef(false)
    const refetchBasketRef = useRef(refetchBasket)

    useEffect(() => {
        refetchBasketRef.current = refetchBasket
    }, [refetchBasket])

    const checkForAbandonedPayment = useCallback(async () => {
        if (
            hasDetectedRef.current ||
            isProcessingRef.current ||
            !enabled ||
            !authToken ||
            !basketId
        ) {
            return false
        }

        const urlParams = new URLSearchParams(window.location.search)
        const hasRedirectParams = redirectParams.some((param) => urlParams.get(param))

        if (hasRedirectParams) {
            return false
        }

        try {
            const refetchResult = await refetchBasketRef.current()

            const freshBasket = refetchResult?.data?.baskets?.[0]

            if (!freshBasket || refetchResult?.data?.total === 0) {
                return false
            }

            const hasPaymentData = paymentDataFields.some((field) => freshBasket[field])

            if (!hasPaymentData) {
                return false
            }

            isProcessingRef.current = true
            setError(null)

            const paymentCancelService = new PaymentCancelService(
                authToken,
                customerId,
                basketId,
                site
            )

            await paymentCancelService.cancelAbandonedPayment('abandoned_session')

            window.location.reload()

            return true
        } catch (err) {
            console.error('Error in abandoned payment detection:', err)
            setError(err)
            return false
        } finally {
            isProcessingRef.current = false
        }
    }, [enabled, authToken, customerId, basketId, site, paymentDataFields, redirectParams])

    useEffect(() => {
        if (!enabled || !basketId) {
            return
        }

        const handlePageShow = async (event) => {
            if (event.persisted) {
                await checkForAbandonedPayment()
            }
        }

        window.addEventListener('pageshow', handlePageShow)

        return () => {
            window.removeEventListener('pageshow', handlePageShow)
        }
    }, [basketId, enabled, checkForAbandonedPayment])

    return {
        error,
        checkForAbandonedPayment
    }
}

export default useHandleBackNavigation
