import {useCallback, useEffect, useRef, useState} from 'react'
import {PaymentCancelService} from '../services/payment-cancel'

/**
 * Configuration options for the useHandleBackNavigation hook.
 * @typedef {Object} UseHandleBackNavigationConfig
 * @property {string} authToken - The authentication token.
 * @property {string} customerId - The customer ID.
 * @property {string} basketId - The basket ID.
 * @property {object} site - The site configuration object.
 * @property {string[]} [redirectParams=['redirectResult', 'sessionId']] - URL params that indicate a valid redirect return.
 * @property {boolean} [enabled=true] - Whether detection is enabled.
 * @property {function} [navigate] - React Router navigate function.
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
 *   navigate
 * })
 */
const useHandleBackNavigation = ({
    authToken,
    customerId,
    basketId,
    site,
    navigate,
    redirectParams = ['redirectResult', 'sessionId'],
    enabled = true
}) => {
    const [error, setError] = useState(null)
    const isProcessingRef = useRef(false)

    const checkForAbandonedPayment = useCallback(async () => {
        if (isProcessingRef.current || !enabled || !authToken || !basketId) {
            return false
        }

        const urlParams = new URLSearchParams(window.location.search)
        const hasRedirectParams = redirectParams.some((param) => urlParams.get(param))

        if (hasRedirectParams) {
            return false
        }

        // Read orderNo pushed to history before redirect (e.g. Klarna) so the server
        // can directly fail that order without needing to look it up.
        const orderNo = urlParams.get('orderNo')

        try {
            isProcessingRef.current = true
            setError(null)

            const paymentCancelService = new PaymentCancelService(
                authToken,
                customerId,
                basketId,
                site
            )

            const cancelResponse = await paymentCancelService.cancelAbandonedPayment(
                'abandoned_session',
                orderNo
            )

            if (cancelResponse?.cancelled === false) {
                return false
            }

            const cleanParams = new URLSearchParams(window.location.search)
            cleanParams.delete('orderNo')

            if (navigate && cancelResponse?.newBasketId) {
                cleanParams.set('newBasketId', cancelResponse.newBasketId)
                navigate(`/checkout?${cleanParams.toString()}`)
            } else {
                const cleanUrl = `${window.location.pathname}?${cleanParams.toString()}`
                window.location.replace(cleanUrl)
            }

            return true
        } catch (err) {
            console.error('Error in abandoned payment detection:', err)
            setError(err)
            return false
        } finally {
            isProcessingRef.current = false
        }
    }, [enabled, authToken, customerId, basketId, site, navigate, redirectParams])

    // Check once when basketId first becomes available to handle SPA back navigation (React Router).
    const checkForAbandonedPaymentRef = useRef(checkForAbandonedPayment)
    useEffect(() => {
        checkForAbandonedPaymentRef.current = checkForAbandonedPayment
    }, [checkForAbandonedPayment])

    const hasMountCheckedRef = useRef(false)
    useEffect(() => {
        if (!enabled || !basketId || hasMountCheckedRef.current) {
            return
        }
        hasMountCheckedRef.current = true
        checkForAbandonedPaymentRef.current()
    }, [basketId, enabled])

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
