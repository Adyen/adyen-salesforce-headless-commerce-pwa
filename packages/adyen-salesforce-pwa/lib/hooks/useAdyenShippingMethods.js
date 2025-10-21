import {useEffect, useState} from 'react'
import {AdyenShippingMethodsService} from '../services/shipping-methods'

/**
 * A hook for fetching and managing the Adyen shipping methods data.
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
const useAdyenShippingMethods = ({authToken, customerId, basketId, site, skip = false}) => {
    const [isLoading, setIsLoading] = useState(!skip)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchShippingMethods = async () => {
            if (skip || !authToken || !basketId) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const adyenShippingMethodsService = new AdyenShippingMethodsService(
                authToken,
                customerId,
                basketId,
                site
            )
            try {
                const result = await adyenShippingMethodsService.getShippingMethods()
                setData(result)
            } catch (err) {
                setError(err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchShippingMethods()
    }, [authToken, customerId, basketId, site?.id, skip])

    return {isLoading, data, error}
}

export default useAdyenShippingMethods
