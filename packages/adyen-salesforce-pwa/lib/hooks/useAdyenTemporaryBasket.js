import {useState, useCallback, useRef, useEffect} from 'react'
import {AdyenTemporaryBasketService} from '../services/temporary-basket'

/**
 * Custom hook for managing Adyen temporary basket operations
 * @param {Object} options - Configuration options
 * @param {string} options.authToken - User authentication token
 * @param {string} options.customerId - Customer ID
 * @param {Object} options.site - Site configuration object
 * @param {Boolean} options.isExpressPdp - Whether the basket is for an express PDP
 * @param {Function} [options.onError] - Error callback function
 * @returns {Object} Temporary basket state and methods
 */
export const useAdyenTemporaryBasket = ({
    authToken,
    customerId,
    site,
    isExpressPdp,
    onError = () => {}
} = {}) => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [temporaryBasket, setTemporaryBasket] = useState(null)
    const serviceRef = useRef(null)
    const isInitialized = useRef(false)

    useEffect(() => {
        if (authToken && customerId && site?.id && isExpressPdp) {
            serviceRef.current = new AdyenTemporaryBasketService(authToken, customerId, site)
            isInitialized.current = true
        } else {
            isInitialized.current = false
        }
    }, [authToken, customerId, site, isExpressPdp])

    /**
     * Create a new temporary basket, optionally with a product
     * @param {Object} [product] - Optional product to add to the basket
     * @returns {Promise<Object|null>} Created basket data or null if failed
     */
    const createTemporaryBasket = useCallback(
        async (product) => {
            if (!isInitialized.current || !serviceRef.current) {
                await new Promise((resolve) => setTimeout(resolve, 100))
                if (!isInitialized.current || !serviceRef.current) {
                    const error = new Error('Temporary basket service not initialized')
                    setError(error)
                    onError(error)
                    return null
                }
            }

            setIsLoading(true)
            setError(null)

            try {
                const basketData = await serviceRef.current.createTemporaryBasket(product)
                setTemporaryBasket(basketData)
                return basketData
            } catch (error) {
                setError(error)
                onError(error)
                return null
            } finally {
                setIsLoading(false)
            }
        },
        [onError]
    )

    return {
        /**
         * Create a new temporary basket
         * @type {Function}
         */
        createTemporaryBasket,

        /**
         * Current temporary basket data
         * @type {Object|null}
         */
        temporaryBasket,

        /**
         * Loading state
         * @type {boolean}
         */
        isLoading,

        /**
         * Error state
         * @type {Error|null}
         */
        error,

        /**
         * Reset the hook state
         */
        reset: useCallback(() => {
            setTemporaryBasket(null)
            setError(null)
            setIsLoading(false)
        }, [])
    }
}

export default useAdyenTemporaryBasket
