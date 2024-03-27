import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {paymentMethodsConfiguration} from '../components/paymentMethodsConfiguration'
import {AdyenEnvironmentService} from '../services/environment'
import {onPaymentsDetailsSuccess, onPaymentsSuccess} from './helper'

const AdyenExpressCheckoutContext = React.createContext({})

export const AdyenExpressCheckoutProvider = ({
    children,
    useAccessToken,
    useCustomerId,
    useCustomerType,
    useMultiSite,
    adyenConfig
}) => {
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const customerType = useCustomerType()
    const {data: basket} = useCurrentBasket()
    const {locale, site} = useMultiSite()
    const navigate = useNavigation()

    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenEnvironment, setAdyenEnvironment] = useState()
    const [adyenStateData, setAdyenStateData] = useState()

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

    const getPaymentMethodsConfiguration = async ({
        beforeSubmit = [],
        afterSubmit = [],
        beforeAdditionalDetails = [],
        afterAdditionalDetails = [],
        onError
    }) => {
        const token = await getTokenWhenReady()
        return paymentMethodsConfiguration({
            additionalPaymentMethodsConfiguration: adyenConfig?.paymentMethodsConfiguration,
            paymentMethods: adyenPaymentMethods?.paymentMethods,
            customerType,
            token,
            site,
            basket: basket,
            customerId,
            onError: adyenConfig?.onError || onError,
            onNavigate: navigate,
            afterSubmit: [
                ...afterSubmit,
                ...(adyenConfig?.afterSubmit || []),
                onPaymentsSuccess(navigate)
            ],
            beforeSubmit: [...beforeSubmit, ...(adyenConfig?.beforeSubmit || [])],
            afterAdditionalDetails: [
                ...afterAdditionalDetails,
                ...(adyenConfig?.afterAdditionalDetails || []),
                onPaymentsDetailsSuccess(navigate)
            ],
            beforeAdditionalDetails: [
                ...beforeAdditionalDetails,
                ...(adyenConfig?.beforeAdditionalDetails || [])
            ]
        })
    }

    const value = {
        adyenEnvironment,
        adyenPaymentMethods,
        adyenStateData,
        basket,
        locale,
        site,
        getTokenWhenReady,
        navigate,
        setAdyenStateData: (data) => setAdyenStateData(data),
        getPaymentMethodsConfiguration
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
    useMultiSite: PropTypes.any,
    adyenConfig: PropTypes.any
}

/**
 * A hook for managing checkout state and actions
 * @returns {Object} Checkout data and actions
 */
export const useAdyenExpressCheckout = () => {
    return React.useContext(AdyenExpressCheckoutContext)
}
