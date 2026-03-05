import {useEffect, useState} from 'react'
import {AdyenOrderNumberService} from '../services/order-number'

/**
 * A hook that ensures the basket has an order number before the payment dropin initializes.
 * Calls GET /api/adyen/order-number, which is idempotent on the server: if the basket already
 * has a c_orderNo it is returned as-is; otherwise a fresh one is generated and persisted.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {string} props.basketId - The basket ID.
 * @param {object} props.site - The site object.
 * @param {string} [props.existingOrderNo] - Used only to seed initial local state; the server
 *   is the authoritative guard against duplicate generation.
 * @param {boolean} [props.skip] - If true, the fetch will be skipped.
 * @returns {{isLoading: boolean, orderNo: string|null, error: object|null}}
 */
const useAdyenOrderNumber = ({
    authToken,
    customerId,
    basketId,
    site,
    existingOrderNo,
    skip = false
}) => {
    const [isLoading, setIsLoading] = useState(!skip)
    const [orderNo, setOrderNo] = useState(existingOrderNo || null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchOrderNumber = async () => {
            if (skip || !authToken) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const orderNumberService = new AdyenOrderNumberService(
                authToken,
                customerId,
                basketId,
                site
            )
            try {
                const result = await orderNumberService.fetchOrderNumber()
                setOrderNo(result.orderNo)
            } catch (err) {
                setError(err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchOrderNumber()
    }, [authToken, customerId, basketId, site?.id, skip])

    return {isLoading, orderNo, error}
}

export default useAdyenOrderNumber
