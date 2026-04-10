import {useEffect, useState} from 'react'
import {AdyenDonationsService} from '../services/donations'

/**
 * A hook for fetching active Adyen donation campaigns.
 * It handles loading, error, and data states internally.
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {object} props.site - The site object.
 * @param {object} props.locale - The locale object.
 * @param {string} props.orderNo - The order number from the completed payment.
 * @param {boolean} [props.skip] - If true, the fetch will be skipped.
 * @returns {{isLoading: boolean, data: object|null, error: object|null}}
 */
const useAdyenDonationCampaigns = ({
    authToken,
    customerId,
    site,
    locale,
    orderNo,
    skip = false
}) => {
    const [isLoading, setIsLoading] = useState(!skip)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchCampaigns = async () => {
            if (skip || !authToken || !orderNo) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            const donationsService = new AdyenDonationsService(authToken, customerId, null, site)
            try {
                const result = await donationsService.fetchDonationCampaigns(orderNo, locale)
                setData(result)
            } catch (err) {
                setError(err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchCampaigns()
    }, [authToken, customerId, site?.id, locale?.id, orderNo, skip])

    return {isLoading, data, error}
}

export default useAdyenDonationCampaigns
