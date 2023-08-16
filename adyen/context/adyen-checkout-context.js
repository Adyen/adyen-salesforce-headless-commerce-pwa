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

    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenStateData, setAdyenStateData] = useState()

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            const token = await getTokenWhenReady()
            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token)
            try {
                const data = await adyenPaymentMethodsService.fetchPaymentMethods(
                    customerId,
                    locale
                )
                setAdyenPaymentMethods(data ? data : {error: true})
            } catch (error) {
                setAdyenPaymentMethods({error})
            }
        }

        if (!adyenPaymentMethods) {
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
