import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {AdyenEnvironmentService} from '../services/environment'
import {AdyenShippingMethodsService} from '../services/shipping-methods'

export const AdyenExpressCheckoutContext = React.createContext({})

export const fetchPaymentMethods = async (customerId, site, locale, getTokenWhenReady) => {
    const token = await getTokenWhenReady()
    const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token, site)
    try {
        return await adyenPaymentMethodsService.fetchPaymentMethods(customerId, locale)
    } catch (error) {
        return null
    }
}

export const fetchEnvironment = async (site, getTokenWhenReady) => {
    const token = await getTokenWhenReady()
    const adyenEnvironmentService = new AdyenEnvironmentService(token, site)
    try {
        return await adyenEnvironmentService.fetchEnvironment()
    } catch (error) {
        return null
    }
}

export const fetchShippingMethods = async (basketId, site, getTokenWhenReady) => {
    const token = await getTokenWhenReady()
    const adyenShippingMethodsService = new AdyenShippingMethodsService(token, site)
    try {
        return await adyenShippingMethodsService.getShippingMethods(basketId)
    } catch (error) {
        return null
    }
}

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
    const [shippingMethods, setShippingMethods] = useState()

    useEffect(() => {
        const fetchAdyenData = async () => {
            const [environment, paymentMethods] = await Promise.all([
                fetchEnvironment(site, getTokenWhenReady),
                fetchPaymentMethods(customerId, site, locale, getTokenWhenReady)
            ])
            setAdyenEnvironment(environment || {error: true})
            setAdyenPaymentMethods(paymentMethods || {error: true})
        }

        fetchAdyenData()
    }, [])

    useEffect(() => {
        const fetchShippingMethodsData = async () => {
            const shippingMethods = await fetchShippingMethods(
                basket?.basketId,
                site,
                getTokenWhenReady
            )
            setShippingMethods(shippingMethods || {error: true})
        }

        if (basket && !shippingMethods) {
            fetchShippingMethodsData()
        }
    }, [basket])

    const value = {
        adyenEnvironment,
        adyenPaymentMethods,
        basket,
        locale,
        site,
        getTokenWhenReady,
        navigate,
        shippingMethods,
        fetchShippingMethods
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

export default AdyenExpressCheckoutProvider
