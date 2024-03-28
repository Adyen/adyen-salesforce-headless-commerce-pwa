import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {AdyenEnvironmentService} from '../services/environment'

const AdyenExpressCheckoutContext = React.createContext({})

export const AdyenExpressCheckoutProvider = ({
    children,
    useAccessToken,
    useCustomerId,
    useMultiSite
}) => {
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const {data: basket} = useCurrentBasket()
    const {locale, site} = useMultiSite()
    const navigate = useNavigation()

    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenEnvironment, setAdyenEnvironment] = useState()

    const fetchPaymentMethods = async () => {
        const token = await getTokenWhenReady()
        const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token, site)
        try {
            return await adyenPaymentMethodsService.fetchPaymentMethods(customerId, locale)
        } catch (error) {
            return null
        }
    }

    const fetchEnvironment = async () => {
        const token = await getTokenWhenReady()
        const adyenEnvironmentService = new AdyenEnvironmentService(token, site)
        try {
            return await adyenEnvironmentService.fetchEnvironment()
        } catch (error) {
            return null
        }
    }

    useEffect(() => {
        const fetchAdyenData = async () => {
            const [environment, paymentMethods] = await Promise.all([
                fetchEnvironment(),
                fetchPaymentMethods()
            ])
            setAdyenEnvironment(environment || {error: true})
            setAdyenPaymentMethods(paymentMethods || {error: true})
        }

        fetchAdyenData()
    }, [])

    const value = {
        adyenEnvironment,
        adyenPaymentMethods,
        basket,
        locale,
        site,
        getTokenWhenReady,
        navigate
    }

    return (
        <AdyenExpressCheckoutContext.Provider value={value}>
            {children}
        </AdyenExpressCheckoutContext.Provider>
    )
}

AdyenExpressCheckoutProvider.propTypes = {
    children: PropTypes.any,
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any,
    useMultiSite: PropTypes.any
}

/**
 * A hook for managing checkout state and actions
 * @returns {Object} Checkout data and actions
 */
export const useAdyenExpressCheckout = () => {
    return React.useContext(AdyenExpressCheckoutContext)
}
