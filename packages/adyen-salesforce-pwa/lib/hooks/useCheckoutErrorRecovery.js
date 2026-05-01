import {useEffect, useRef, useState} from 'react'
import {useLocation} from 'react-router-dom'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'

/**
 * Detects a `newBasketId` query param in the URL after a failed payment,
 * cleans the URL via React Router navigation, refetches the basket, and
 * increments a key that the caller can use to force-remount AdyenCheckout.
 *
 * @param {object} params
 * @param {Function} [params.refetchBasket] - Optional async function that re-fetches the current basket. If not provided, uses useCurrentBasket hook.
 * @param {Function} [params.navigate] - Optional React Router navigate function. If not provided, uses useNavigation hook.
 * @returns {{adyenCheckoutKey: number, isRefetchingBasket: boolean}}
 */
const useCheckoutErrorRecovery = ({
    refetchBasket: refetchBasketProp,
    navigate: navigateProp
} = {}) => {
    const {refetch: refetchFromHook} = useCurrentBasket()
    const navigateFromHook = useNavigation()

    const refetchBasket = refetchBasketProp ?? refetchFromHook
    const navigate = navigateProp ?? navigateFromHook
    const location = useLocation()
    const [adyenCheckoutKey, setAdyenCheckoutKey] = useState(0)
    const [isRefetchingBasket, setIsRefetchingBasket] = useState(false)
    const isHandlingErrorRef = useRef(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search)
        const newBasketId = urlParams.get('newBasketId')
        const hasError = urlParams.get('error') === 'true'

        if (newBasketId && !isHandlingErrorRef.current) {
            isHandlingErrorRef.current = true
            setIsRefetchingBasket(true)
            refetchBasket().finally(() => {
                setIsRefetchingBasket(false)
                navigate('/checkout')
                setAdyenCheckoutKey((prev) => prev + 1)
                isHandlingErrorRef.current = false
            })
        } else if (hasError && !newBasketId && !isHandlingErrorRef.current) {
            isHandlingErrorRef.current = true
            setIsRefetchingBasket(true)
            refetchBasket().finally(() => {
                setIsRefetchingBasket(false)
                navigate('/checkout')
                setAdyenCheckoutKey((prev) => prev + 1)
                isHandlingErrorRef.current = false
            })
        }
    }, [location.search])

    return {adyenCheckoutKey, isRefetchingBasket}
}

export default useCheckoutErrorRecovery
