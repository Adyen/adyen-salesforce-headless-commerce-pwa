import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {resolveLocaleFromUrl} from '@salesforce/retail-react-app/app/utils/site-utils'

const AdyenCheckoutContext = React.createContext()

export const AdyenCheckoutProvider = ({children}) => {
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const locale = resolveLocaleFromUrl(`${window.location.pathname}${window.location.search}`)

    const [fetching, setFetching] = useState(false)
    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenStateData, setAdyenStateData] = useState()
    const [adyenCheckoutInstance, setAdyenCheckoutInstance] = useState()
    const [orderNumber, setOrderNumber] = useState()

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            setFetching(true)
            const token = await getTokenWhenReady()
            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token)
            try {
                const data = await adyenPaymentMethodsService.fetchPaymentMethods(
                    customerId,
                    locale,
                )
                setAdyenPaymentMethods(data ? data : {error: true})
                setFetching(false)
            } catch (error) {
                setAdyenPaymentMethods({error})
                setFetching(false)
            }
        }

        if (!adyenPaymentMethods && !fetching) {
            fetchPaymentMethods()
        }
    })

    const value = {
        adyenPaymentMethods,
        adyenStateData,
        adyenCheckoutInstance,
        orderNumber,
        setAdyenStateData: (data) => setAdyenStateData(data),
        setAdyenCheckoutInstance: (data) => setAdyenCheckoutInstance(data),
        setOrderNumber: (data) => setOrderNumber(data)
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
