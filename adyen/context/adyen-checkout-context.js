import React, {useEffect, useState} from 'react'
import {useLocation} from 'react-router-dom'
import PropTypes from 'prop-types'
import {useAccessToken, useCustomerId, useCustomerType} from '@salesforce/commerce-sdk-react'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {resolveLocaleFromUrl} from '@salesforce/retail-react-app/app/utils/site-utils'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
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

    const [fetchingPaymentMethods, setFetchingPaymentMethods] = useState(false)
    const [adyenPaymentMethods, setAdyenPaymentMethods] = useState()
    const [adyenStateData, setAdyenStateData] = useState()

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            setFetchingPaymentMethods(true)
            const token = await getTokenWhenReady()
            const adyenPaymentMethodsService = new AdyenPaymentMethodsService(token)
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

    const getPaymentMethodsConfiguration = async ({
        beforeSubmit = [],
        afterSubmit = [],
        beforeAdditionalDetails = [],
        afterAdditionalDetails = [],
        onError
    }) => {
        const token = await getTokenWhenReady()
        return paymentMethodsConfiguration({
            paymentMethods: adyenPaymentMethods?.paymentMethods,
            customerType,
            token,
            basket: basket,
            customerId,
            onError: onError,
            afterSubmit: [...afterSubmit, onPaymentsSuccess],
            beforeSubmit: beforeSubmit,
            afterAdditionalDetails: [...afterAdditionalDetails, onPaymentsDetailsSuccess],
            beforeAdditionalDetails: beforeAdditionalDetails
        })
    }

    const onPaymentsSuccess = async (state, component, props, responses) => {
        if (responses?.paymentsResponse?.isSuccessful) {
            navigate(`/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}`)
        } else if (responses?.paymentsResponse?.action) {
            await component.handleAction(responses?.paymentsResponse?.action)
        } else {
            return new Error(responses?.paymentsResponse)
        }
    }

    const onPaymentsDetailsSuccess = async (state, component, props, responses) => {
        if (responses?.paymentsDetailsResponse?.isSuccessful) {
            navigate(
                `/checkout/confirmation/${responses?.paymentsDetailsResponse?.merchantReference}`
            )
        } else if (responses?.paymentsDetailsResponse?.action) {
            await component.handleAction(responses?.paymentsDetailsResponse?.action)
        } else {
            return new Error(responses?.paymentsDetailsResponse)
        }
    }

    const value = {
        adyenPaymentMethods,
        adyenStateData,
        setAdyenStateData: (data) => setAdyenStateData(data),
        getPaymentMethodsConfiguration
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
