import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {paymentMethodsConfiguration} from '../components/paymentMethodsConfiguration'
import {AdyenEnvironmentService} from '../services/environment'
import {onPaymentsDetailsSuccess, onPaymentsSuccess} from './helper'

export const AdyenCheckoutContext = React.createContext({})

const AdyenCheckoutProvider = ({
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

    const [fetchingPaymentMethods, setFetchingPaymentMethods] = useState(false)
    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenEnvironment, setAdyenEnvironment] = useState()
    const [adyenStateData, setAdyenStateData] = useState()
    const [adyenPaymentInProgress, setAdyenPaymentInProgress] = useState()

    useEffect(() => {
        const fetchEnvironment = async () => {
            const token = await getTokenWhenReady()
            const adyenEnvironmentService = new AdyenEnvironmentService(token, site)
            try {
                const data = await adyenEnvironmentService.fetchEnvironment()
                setAdyenEnvironment(data ? data : {error: true})
            } catch (error) {
                setAdyenEnvironment({error})
            }
        }
        fetchEnvironment()
    }, [])

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            setFetchingPaymentMethods(true)
            const token = await getTokenWhenReady()
            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token, site)
            try {
                const data = await adyenPaymentMethodsService.fetchPaymentMethods(
                    customerId,
                    locale
                )
                setAdyenPaymentMethods(data ? data : {error: true})
                setFetchingPaymentMethods(false)
            } catch (error) {
                setAdyenPaymentMethods({error})
                setFetchingPaymentMethods(false)
            }
        }

        if (!adyenPaymentMethods && !fetchingPaymentMethods) {
            fetchPaymentMethods()
        }
    }, [basket?.basketId])

    const getTranslations = () => {
        return adyenConfig?.translations && Object.hasOwn(adyenConfig?.translations, locale.id)
            ? adyenConfig?.translations
            : null
    }

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
        adyenPaymentInProgress,
        locale,
        navigate,
        setAdyenPaymentInProgress: (data) => setAdyenPaymentInProgress(data),
        setAdyenStateData: (data) => setAdyenStateData(data),
        getPaymentMethodsConfiguration,
        getTranslations
    }

    return <AdyenCheckoutContext.Provider value={value}>{children}</AdyenCheckoutContext.Provider>
}

AdyenCheckoutProvider.propTypes = {
    children: PropTypes.any,
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any,
    useMultiSite: PropTypes.any,
    adyenConfig: PropTypes.any
}

export default AdyenCheckoutProvider
