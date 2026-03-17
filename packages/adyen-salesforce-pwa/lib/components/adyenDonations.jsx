import React, {useEffect, useRef, useState, useCallback} from 'react'
import PropTypes from 'prop-types'
import {AdyenCheckout, Donation} from '@adyen/adyen-web'
import {getCheckoutConfig} from './helpers/adyenCheckout.utils'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenDonationCampaigns from '../hooks/useAdyenDonationCampaigns'
import {AdyenDonationsService} from '../services/donations'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'

const AdyenDonations = ({
    // Required props
    site,
    locale,
    orderNo,

    // Callbacks
    onDonate,
    onCancel,
    onComplete,
    onError = [],

    // UI
    spinner = null,

    // Optional overrides
    translations
}) => {
    const paymentContainerRefs = useRef([])
    const donationComponentRefs = useRef([])
    const [isLoading, setIsLoading] = useState(false)
    const customerId = useCustomerId()
    const {getTokenWhenReady} = useAccessToken()
    const [authToken, setAuthToken] = useState()

    useEffect(() => {
        const getToken = async () => {
            const token = await getTokenWhenReady()
            setAuthToken(token)
        }

        getToken()
    }, [])

    const {
        data: adyenEnvironment,
        error: adyenEnvironmentError,
        isLoading: fetchingEnvironment
    } = useAdyenEnvironment({
        authToken,
        customerId,
        site,
        skip: !authToken || !customerId
    })

    const {
        data: donationCampaignsData,
        error: donationCampaignsError,
        isLoading: fetchingCampaigns
    } = useAdyenDonationCampaigns({
        authToken,
        customerId,
        site,
        locale,
        orderNo,
        skip: !orderNo || !authToken || !customerId
    })

    // Memoize the translations to prevent unnecessary recalculations
    const getTranslations = useCallback(() => {
        return translations && translations[locale.id] ? translations : null
    }, [translations, locale.id])

    useEffect(() => {
        if (
            !authToken ||
            !adyenEnvironment ||
            !donationCampaignsData ||
            fetchingEnvironment ||
            fetchingCampaigns
        ) {
            return
        }

        // Handle errors
        if (adyenEnvironmentError) {
            onError.forEach((cb) => cb(adyenEnvironmentError))
            return
        }

        if (donationCampaignsError) {
            onError.forEach((cb) => cb(donationCampaignsError))
            return
        }

        const campaigns = donationCampaignsData?.donationCampaigns
        if (!campaigns || campaigns.length === 0) {
            return
        }

        let isMounted = true

        const initializeDonationsComponent = async (campaign, index) => {
            try {
                if (donationComponentRefs.current[index]) {
                    return
                }

                const translations = getTranslations()
                const checkoutConfig = getCheckoutConfig(
                    adyenEnvironment,
                    null,
                    translations,
                    locale
                )
                const checkout = await AdyenCheckout(checkoutConfig)

                if (!isMounted) return

                const donationsService = new AdyenDonationsService(
                    authToken,
                    customerId,
                    null,
                    site
                )

                const donationConfiguration = {
                    ...campaign,
                    commercialTxAmount: donationCampaignsData.orderTotal,
                    onDonate: async (state, component) => {
                        setIsLoading(true)
                        try {
                            const response = await donationsService.submitDonation({
                                orderNo,
                                donationCampaignId: campaign.id,
                                donationAmount: state.data.amount
                            })
                            if (onDonate) {
                                onDonate(response)
                            }
                            if (onComplete) {
                                onComplete(response)
                            }
                            component.setStatus('success')
                        } catch (error) {
                            onError.forEach((cb) => cb(error))
                            component.setStatus('error')
                        } finally {
                            setIsLoading(false)
                        }
                    },
                    onCancel: () => {
                        if (onCancel) {
                            onCancel()
                        }
                    },
                    onError: (error, component) => {
                        onError.forEach((cb) => cb(error))
                        setIsLoading(false)
                        if (component) {
                            component.setStatus('ready')
                        }
                    }
                }

                const donationComponent = new Donation(checkout, donationConfiguration)
                donationComponentRefs.current[index] = donationComponent.mount(
                    paymentContainerRefs.current[index]
                )
            } catch (error) {
                onError.forEach((cb) => cb(error))
            }
        }

        campaigns.forEach((campaign, index) => {
            initializeDonationsComponent(campaign, index)
        })

        return () => {
            isMounted = false
            donationComponentRefs.current.forEach((component, index) => {
                if (component) {
                    try {
                        component.unmount()
                    } catch (e) {
                        console.error('Error unmounting donation component:', e)
                    }
                    donationComponentRefs.current[index] = null
                }
            })
        }
    }, [
        authToken,
        customerId,
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        donationCampaignsData
    ])

    const campaigns = donationCampaignsData?.donationCampaigns

    return (
        <>
            {(isLoading || fetchingEnvironment || fetchingCampaigns) && spinner && <>{spinner}</>}
            {campaigns && campaigns.length > 0 && (
                <div>
                    {campaigns.map((campaign, index) => (
                        <div
                            key={campaign.id}
                            ref={(el) => {
                                paymentContainerRefs.current[index] = el
                            }}
                        />
                    ))}
                </div>
            )}
        </>
    )
}

AdyenDonations.propTypes = {
    // Required props
    site: PropTypes.object.isRequired,
    locale: PropTypes.object.isRequired,
    orderNo: PropTypes.string.isRequired,

    // Callbacks
    onDonate: PropTypes.func,
    onCancel: PropTypes.func,
    onComplete: PropTypes.func,
    onError: PropTypes.arrayOf(PropTypes.func),

    // UI
    spinner: PropTypes.node,

    // Optional overrides
    translations: PropTypes.object
}

export default AdyenDonations
