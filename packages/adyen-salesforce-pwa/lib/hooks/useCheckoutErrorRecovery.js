import {useEffect, useRef, useState} from 'react'
import {useLocation} from 'react-router-dom'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'

// Module-level (not component-level) recovery lock, keyed by the newBasketId
// being recovered. The Payment component that owns this hook can be unmounted
// and remounted mid-flight by CheckoutContainer, which gates rendering on
// basket/customer data being present. A per-instance `useRef` guard does not
// survive that remount: an in-flight recovery can be orphaned by the unmount,
// or the URL params can be lost before a fresh instance gets a chance to act
// on them. Tracking progress at module scope (mirroring the
// `persistedPaymentsError` pattern in checkout/index.jsx for the same class of
// remount issue) ensures a subsequent remount always resumes an unfinished
// recovery instead of silently dropping it.
let recoveryKeyInProgress = null

/**
 * Detects a `newBasketId` query param in the URL after a failed payment,
 * cleans the URL via React Router navigation, refetches the basket, and
 * increments a key that the caller can use to force-remount AdyenCheckout.
 *
 * @param {object} params
 * @param {Function} params.refetchBasket - Async function that re-fetches the current basket.
 * @param {Function} [params.navigate] - React Router navigate / useNavigation result (optional, falls back to hook).
 * @returns {{adyenCheckoutKey: number, isRefetchingBasket: boolean}}
 */
const useCheckoutErrorRecovery = ({refetchBasket, navigate: navigateProp}) => {
    const hookNavigate = useNavigation()
    const navigate = navigateProp ?? hookNavigate
    const location = useLocation()
    const [adyenCheckoutKey, setAdyenCheckoutKey] = useState(0)
    const [isRefetchingBasket, setIsRefetchingBasket] = useState(false)
    const ownsRecoveryRef = useRef(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search)
        const newBasketId = urlParams.get('newBasketId')
        const hasError = urlParams.get('error') === 'true'

        if (!newBasketId && !hasError) {
            return
        }
        if (recoveryKeyInProgress) {
            return
        }

        recoveryKeyInProgress = newBasketId || 'error-only'
        ownsRecoveryRef.current = true
        setIsRefetchingBasket(true)
        refetchBasket().finally(() => {
            setIsRefetchingBasket(false)
            navigate('/checkout')
            setAdyenCheckoutKey((prev) => prev + 1)
            recoveryKeyInProgress = null
            ownsRecoveryRef.current = false
        })
    }, [location.search])

    // If this instance is torn down before its recovery finished (e.g.
    // CheckoutContainer swapped it out for a loading skeleton), release the
    // lock so a remounted instance can pick the recovery back up rather than
    // the newBasketId/error params being left unhandled.
    useEffect(() => {
        return () => {
            if (ownsRecoveryRef.current) {
                recoveryKeyInProgress = null
                ownsRecoveryRef.current = false
            }
        }
    }, [])

    return {adyenCheckoutKey, isRefetchingBasket}
}

export default useCheckoutErrorRecovery
