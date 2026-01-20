import {useEffect, useState} from 'react'
import {AdyenPaymentMethodsForExpressService} from '../services/payment-methods-for-express'

/**
 * A hook for fetching and managing the Adyen payment methods for express checkout (Apple Pay, PayPal).
 * It handles loading, error, and data states internally.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {object} props.site - The site object.
 * @param {object} props.locale - The locale object.
 * @param {string} props.currency - The currency code (e.g., 'USD', 'GBP').
 * @param {boolean} [props.skip] - If true, the fetch will be skipped.
 * @returns {{isLoading: boolean, data: object|null, error: object|null}}
 */
const useAdyenPaymentMethodsForExpress = ({
    authToken,
    customerId,
    site,
    locale,
    currency,
    skip = false
}) => {
    const [isLoading, setIsLoading] = useState(!skip)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchPaymentMethodsForExpress = async () => {
            if (skip || !authToken || !currency) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const adyenPaymentMethodsForExpressService = new AdyenPaymentMethodsForExpressService(
                authToken,
                customerId,
                site
            )
            try {
                const result =
                    await adyenPaymentMethodsForExpressService.fetchPaymentMethodsForExpress(
                        locale,
                        currency
                    )
                setData(result)
            } catch (err) {
                setError(err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPaymentMethodsForExpress()
    }, [authToken, customerId, site?.id, locale?.id, currency, skip])

    return {isLoading, data, error}
}

export default useAdyenPaymentMethodsForExpress
