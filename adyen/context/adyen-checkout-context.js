import React, {useEffect, useState} from 'react'
import {useLocation} from 'react-router-dom'
import PropTypes from 'prop-types'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {resolveLocaleFromUrl} from '@salesforce/retail-react-app/app/utils/site-utils'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useCustomerType} from '@salesforce/commerce-sdk-react'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {paymentMethodsConfiguration} from '../components/paymentMethodsConfiguration'

const AdyenCheckoutContext = React.createContext()

export const AdyenCheckoutProvider = ({children}) => {
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const customerType = useCustomerType()
    const {data: basket} = useCurrentBasket()
    const location = useLocation()
    const locale = resolveLocaleFromUrl(`${location.pathname}${location.search}`)
    const navigate = useNavigation()

    const [fetching, setFetching] = useState(false)
    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenStateData, setAdyenStateData] = useState()
    const [paymentConfig, setPaymentConfig] = useState()
    const [adyenPaymentMethodsConfig, setAdyenPaymentMethodsConfig] = useState()

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            setFetching(true)
            const token = await getTokenWhenReady()
            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token)
            try {
                const data = await adyenPaymentMethodsService.fetchPaymentMethods(
                    customerId,
                    locale
                )
                setAdyenPaymentMethods(data ? data : {error: true})
                setAdyenPaymentMethodsConfig(
                    paymentMethodsConfiguration({
                        paymentMethods: data.paymentMethods,
                        customerType,
                        token,
                        basketId: basket?.basketId,
                        customerId,
                        successHandler: (merchantReference) =>
                            navigate(`/checkout/confirmation/${merchantReference}`),
                        errorHandler: (error) => console.log(error)
                    })
                )
                setFetching(false)
            } catch (error) {
                setAdyenPaymentMethods({error})
                setFetching(false)
            }
        }

        if (!adyenPaymentMethods && !fetching) {
            fetchPaymentMethods()
        }
    }, [basket?.basketId])

    const value = {
        adyenPaymentMethods,
        adyenStateData,
        paymentConfig,
        adyenPaymentMethodsConfig,
        setAdyenStateData: (data) => setAdyenStateData(data),
        setPaymentConfig: (data) => setPaymentConfig(data),
        setAdyenPaymentMethodsConfig: (data) => setAdyenPaymentMethodsConfig(data)
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
