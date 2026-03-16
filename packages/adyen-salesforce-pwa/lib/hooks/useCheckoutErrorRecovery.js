import {useEffect, useRef, useState} from 'react'
import {useLocation} from 'react-router-dom'

/**
 * Detects a `newBasketId` query param in the URL after a failed payment,
 * cleans the URL via React Router navigation, refetches the basket, and
 * increments a key that the caller can use to force-remount AdyenCheckout.
 *
 * @param {object} params
 * @param {Function} params.refetchBasket - Async function that re-fetches the current basket.
 * @param {Function} params.navigate - React Router navigate / useNavigation result.
 * @returns {{adyenCheckoutKey: number, isRefetchingBasket: boolean}}
 */
const useCheckoutErrorRecovery = ({refetchBasket, navigate}) => {
    const location = useLocation()
    const [adyenCheckoutKey, setAdyenCheckoutKey] = useState(0)
    const [isRefetchingBasket, setIsRefetchingBasket] = useState(false)
    const isHandlingErrorRef = useRef(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search)
        const newBasketId = urlParams.get('newBasketId')
        if (newBasketId && !isHandlingErrorRef.current) {
            isHandlingErrorRef.current = true
            setIsRefetchingBasket(true)
            refetchBasket().finally(() => {
                setIsRefetchingBasket(false)
                navigate('/checkout?error=true')
                setAdyenCheckoutKey((prev) => prev + 1)
                isHandlingErrorRef.current = false
            })
        }
    }, [location.search])

    return {adyenCheckoutKey, isRefetchingBasket}
}

export default useCheckoutErrorRecovery
