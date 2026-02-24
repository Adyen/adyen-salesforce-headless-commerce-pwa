import React, {useEffect, useRef, useState, useCallback} from 'react'
import PropTypes from 'prop-types'
import { AdyenCheckout, Donation, DonationConfiguration } from "@adyen/adyen-web";
import {getCheckoutConfig} from './helpers/adyenCheckout.utils'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenDonationCampaigns from '../hooks/useAdyenDonationCampaigns'
import {AdyenDonationsService} from '../services/donations'

const AdyenDonations = ({
    // Required props
    authToken,
    site,
    locale,
    orderNo,

    // User data
    customerId,

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
    const paymentContainer = useRef(null)
    const donationComponentRef = useRef(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        data: adyenEnvironment,
        error: adyenEnvironmentError,
        isLoading: fetchingEnvironment
    } = useAdyenEnvironment({
        authToken,
        customerId,
        site,
        skip: false
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
        skip: !orderNo
    })

    // Memoize the translations to prevent unnecessary recalculations
    const getTranslations = useCallback(() => {
        return translations && translations[locale.id] ? translations : null
    }, [translations, locale.id])

    useEffect(() => {
        if (
            !adyenEnvironment ||
            !donationCampaignsData ||
            !paymentContainer.current ||
            fetchingEnvironment ||
            fetchingCampaigns
        ) {
            return
        }

        // Handle errors
        if (adyenEnvironmentError) {
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            onError.forEach((cb) => cb(adyenEnvironmentError))
            return
        }

        if (donationCampaignsError) {
            console.error('Error fetching donation campaigns:', donationCampaignsError)
            onError.forEach((cb) => cb(donationCampaignsError))
            return
        }

        const campaigns = donationCampaignsData?.donationCampaigns
        if (!campaigns || campaigns.length === 0) {
            return
        }

        const campaign = campaigns[0]

        let isMounted = true

        const initializeDonationsComponent = async () => {
            try {
                if (donationComponentRef.current) {
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

                // const donationsService = new AdyenDonationsService(
                //     authToken,
                //     customerId,
                //     null,
                //     site
                // )

                const donationConfiguration = {
                    ...campaign,
                    commercialTxAmount: donationCampaignsData.orderTotal,
                    onError: (error, component) => {
                        console.error('Adyen Donation Error:', error)
                        onError.forEach((cb) => cb(error))
                        setIsLoading(false)
                        if (component) {
                            component.setStatus('ready')
                        }
                    }
                }

                console.log(donationConfiguration);
                const donationComponent = new Donation(checkout, donationConfiguration)
                donationComponentRef.current = donationComponent.mount(paymentContainer.current)
            } catch (error) {
                console.error('Error initializing Adyen Donations Component:', error)
                onError.forEach((cb) => cb(error))
            }
        }

        initializeDonationsComponent()

        return () => {
            isMounted = false
            if (donationComponentRef.current) {
                try {
                    donationComponentRef.current.unmount()
                } catch (e) {
                    console.error('Error unmounting donation component:', e)
                }
                donationComponentRef.current = null
            }
        }
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        donationCampaignsData
    ])

    return (
        <>
            {(isLoading || fetchingEnvironment || fetchingCampaigns) && spinner && <>{spinner}</>}
            <div ref={paymentContainer}></div>
        </>
    )
}

AdyenDonations.propTypes = {
    // Required props
    authToken: PropTypes.string.isRequired,
    site: PropTypes.object.isRequired,
    locale: PropTypes.object.isRequired,
    orderNo: PropTypes.string.isRequired,

    // User data
    customerId: PropTypes.string,

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
