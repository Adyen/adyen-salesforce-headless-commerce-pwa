import {useEffect, useState} from 'react'
import {AdyenPaymentMethodsService} from '../services/payment-methods'

/**
 * A hook for fetching and managing the Adyen payment methods data.
 * It handles loading, error, and data states internally.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {string} props.basketId - The basket ID.
 * @param {object} props.site - The site object.
 * @param {object} props.locale - The locale object.
 * @param {boolean} [props.skip] - If true, the fetch will be skipped.
 * @returns {{isLoading: boolean, data: object|null, error: object|null}}
 */
const useAdyenPaymentMethods = ({authToken, customerId, basketId, site, locale, skip = false}) => {
    const [isLoading, setIsLoading] = useState(!skip)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            if (skip || !authToken) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(
                authToken,
                customerId,
                basketId,
                site
            )
            try {
                const result = await adyenPaymentMethodsService.fetchPaymentMethods(locale)
                setData(result)
            } catch (err) {
                setError(err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPaymentMethods()
    }, [authToken, customerId, basketId, site?.id, locale?.id, skip])

    return {isLoading, data, error}
}

export default useAdyenPaymentMethods