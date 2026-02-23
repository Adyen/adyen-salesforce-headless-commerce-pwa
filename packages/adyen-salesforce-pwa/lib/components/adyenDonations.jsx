import React, {useEffect, useRef, useState, useCallback} from 'react'
import PropTypes from 'prop-types'
import {createCheckoutInstance, mountCheckoutComponent} from './helpers/adyenCheckout.utils'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'

const AdyenDonations = ({
    // Required props
    authToken,
    site,
    locale,
    amount,
    currency,

    // User data
    customerId,
    merchantDisplayName = '',

    // Callbacks
    onDonate, // Callback for when a donation is successfully made
    onError = [],

    // UI
    spinner = null,

    // Optional overrides
    dropinConfiguration = {},
    translations,

    ...props
}) => {
    const paymentContainer = useRef(null)
    const checkoutRef = useRef(null)
    const dropinRef = useRef(null)
    const [isLoading, setIsLoading] = useState(false)
    const [adyenStateData, setAdyenStateData] = useState(null)

    // Fetch Adyen environment configuration
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

    // Mock adyenPaymentMethods for donation. In a real scenario, this would come from the backend.
    const adyenPaymentMethods = {
        paymentMethods: [
            {
                name: 'Donation',
                type: 'donation'
            }
        ]
    }

    // Memoize state change handler
    const handleStateChange = useCallback(
        (data) => {
            setAdyenStateData(data)
            // If onDonate is provided, call it with the state data
            if (onDonate) {
                onDonate(data)
            }
        },
        [onDonate]
    )

    // Memoize the translations to prevent unnecessary recalculations
    const getTranslations = useCallback(() => {
        return translations && translations[locale.id] ? translations : null
    }, [translations, locale.id])

    useEffect(() => {
        if (!adyenEnvironment || !paymentContainer.current || fetchingEnvironment) {
            return
        }

        // Handle errors
        if (adyenEnvironmentError) {
            console.error('Error fetching Adyen environment:', adyenEnvironmentError)
            onError.forEach((cb) => cb(adyenEnvironmentError))
            return
        }

        let isMounted = true

        const initializeDonationsCheckout = async () => {
            try {
                if (dropinRef.current) {
                    return
                }

                // Donation specific payment methods configuration
                const donationPaymentMethodsConfiguration = {
                    paymentMethodsResponse: adyenPaymentMethods,
                    // Configuration for the 'donation' payment method type
                    donation: {
                        onDonate: (state, component) => {
                            setIsLoading(true)
                            console.log('Submitting donation:', state.data)
                            if (onDonate) {
                                onDonate(state.data) // Pass the state.data to the onDonate callback
                            }
                            component.setStatus('loading')
                        },
                        // You might need to add other donation-specific configurations here
                        // For example, campaign IDs, predefined amounts etc.
                        details: {
                            // Placeholder for any specific details the Giving component might need
                            // For example, from a /donationCampaigns call
                            amount: {
                                value: amount,
                                currency: currency
                            }
                        }
                    },
                    dropin: {
                        // onReady is typically used for the Drop-in to signal it's ready
                        onReady: () => {
                            setIsLoading(false)
                        }
                        // Customize the donation button or behavior if possible
                        // onDonationDetails: (state, component) => { /* ... */ } // Placeholder for donation specific callback
                    },
                    // This onSubmit is for the overall Dropin instance, handling any generic submission
                    // However, for 'donation' type, 'onDonate' in the donation config above takes precedence.
                    onSubmit: (state, component) => {
                        console.log('Generic Dropin onSubmit for donation:', state.data)
                        // Fallback or additional logic if the specific donation.onDonate is not called
                    },
                    onError: (error, component) => {
                        console.error('Adyen Donation Error:', error)
                        onError.forEach((cb) => cb(error))
                        setIsLoading(false)
                        if (component) {
                            component.setStatus('ready')
                        }
                    }
                }

                checkoutRef.current = await createCheckoutInstance({
                    paymentMethodsConfiguration: donationPaymentMethodsConfiguration,
                    adyenEnvironment,
                    adyenPaymentMethods: adyenPaymentMethods, // Pass the mock payment methods
                    adyenOrder: {
                        amount: {value: amount, currency: currency}
                        // Additional adyenOrder details might be needed for donations
                    },
                    getTranslations: getTranslations,
                    locale,
                    setAdyenStateData: handleStateChange,
                    setIsLoading: setIsLoading
                })

                if (!isMounted) return

                dropinRef.current = mountCheckoutComponent(
                    null, // No specific action for initial mount
                    checkoutRef.current,
                    paymentContainer,
                    donationPaymentMethodsConfiguration,
                    dropinConfiguration
                )
            } catch (error) {
                console.error('Error initializing Adyen Donations Checkout:', error)
                onError.forEach((cb) => cb(error))
            }
        }

        initializeDonationsCheckout()

        return () => {
            isMounted = false
            if (dropinRef.current) {
                try {
                    dropinRef.current.unmount()
                } catch (e) {
                    console.error('Error unmounting dropin:', e)
                }
                dropinRef.current = null
            }
        }
    }, [
        adyenEnvironment?.ADYEN_ENVIRONMENT,
        adyenEnvironment?.ADYEN_CLIENT_KEY,
        amount,
        currency,
        onDonate
    ])

    return (
        <>
            {(isLoading || fetchingEnvironment) && spinner && <>{spinner}</>}
            <div ref={paymentContainer}></div>
        </>
    )
}

AdyenDonations.propTypes = {
    // Required props
    authToken: PropTypes.string.isRequired,
    site: PropTypes.object.isRequired,
    locale: PropTypes.object.isRequired,
    amount: PropTypes.number.isRequired,
    currency: PropTypes.string.isRequired,

    // User data
    customerId: PropTypes.string,
    merchantDisplayName: PropTypes.string,

    // Callbacks
    onDonate: PropTypes.func,
    onError: PropTypes.arrayOf(PropTypes.func),

    // UI
    spinner: PropTypes.node,

    // Optional overrides
    dropinConfiguration: PropTypes.object,
    translations: PropTypes.object
}

export default AdyenDonations
