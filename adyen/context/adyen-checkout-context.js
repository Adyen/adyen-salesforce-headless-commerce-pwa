import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {resolveLocaleFromUrl} from '@salesforce/retail-react-app/app/utils/site-utils'

const AdyenCheckoutContext = React.createContext()

export const AdyenCheckoutProvider = ({children}) => {
    const {data: basket} = useCurrentBasket()
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const locale = resolveLocaleFromUrl(`${window.location.pathname}${window.location.search}`)

    const [fetching, setFetching] = useState(false)
    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenStateData, setAdyenStateData] = useState()

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            setFetching(true)
            const {countryCode} = basket.shipments[0].shippingAddress
            const token = await getTokenWhenReady()
            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token)
            try {
                const data = await adyenPaymentMethodsService.fetchPaymentMethods(
                    customerId,
                    locale,
                    countryCode
                )
                setAdyenPaymentMethods(data ? data : {error: true})
                setFetching(false)
            } catch (error) {
                setAdyenPaymentMethods({error})
                setFetching(false)
            }
        }

        if (
            !adyenPaymentMethods &&
            !fetching &&
            basket.shipments?.length &&
            basket.shipments[0].shippingAddress
        ) {
            fetchPaymentMethods()
        }
    }, [basket])

    const value = {
        adyenPaymentMethods,
        adyenStateData,
        setAdyenStateData: (data) => setAdyenStateData(data)
    }

    return <AdyenCheckoutContext.Provider value={value}>{children}</AdyenCheckoutContext.Provider>
}

AdyenCheckoutProvider.propTypes = {
    children: PropTypes.any
}

/**
 * A hook for managing checkout state and actions
 * @returns {Object} Checkout data and actions
 */
export const useAdyenCheckout = () => {
    return React.useContext(AdyenCheckoutContext)
}
