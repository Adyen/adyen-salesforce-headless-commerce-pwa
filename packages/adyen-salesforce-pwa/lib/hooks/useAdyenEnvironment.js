import {useEffect, useState} from 'react'
import {AdyenEnvironmentService} from '../services/environment'

/**
 * A hook for fetching and managing the Adyen environment data.
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
const useAdyenEnvironment = ({authToken, customerId, basketId, site, skip = false}) => {
    const [isLoading, setIsLoading] = useState(!skip)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchEnvironment = async () => {
            if (skip || !authToken) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const adyenEnvironmentService = new AdyenEnvironmentService(
                authToken,
                customerId,
                basketId,
                site
            )
            try {
                const result = await adyenEnvironmentService.fetchEnvironment()
                setData(result)
            } catch (err) {
                setError(err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchEnvironment()
    }, [authToken, customerId, basketId, site?.id, skip])

    return {isLoading, data, error}
}

export default useAdyenEnvironment