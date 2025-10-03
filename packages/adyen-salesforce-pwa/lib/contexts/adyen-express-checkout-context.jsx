import React, {useCallback, useEffect, useMemo, useReducer} from 'react'
import PropTypes from 'prop-types'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {AdyenEnvironmentService} from '../services/environment'
import {AdyenShippingMethodsService} from '../services/shipping-methods'

const _fetchPaymentMethods = async (customerId, basketId, site, locale, authToken) => {
    const adyenPaymentMethodsService = new AdyenPaymentMethodsService(authToken, customerId, basketId, site)
    try {
        return await adyenPaymentMethodsService.fetchPaymentMethods(locale)
    } catch (error) {
        console.error(error)
        return null
    }
}

const _fetchEnvironment = async (customerId, basketId, site, authToken) => {
    const adyenEnvironmentService = new AdyenEnvironmentService(authToken, customerId, basketId, site)
    try {
        return await adyenEnvironmentService.fetchEnvironment()
    } catch (error) {
        console.error(error)
        return null
    }
}

const _fetchShippingMethods = async (customerId, basketId, site, authToken) => {
    const adyenShippingMethodsService = new AdyenShippingMethodsService(authToken, customerId, basketId, site)
    try {
        return await adyenShippingMethodsService.getShippingMethods()
    } catch (error) {
        console.error(error)
        return null
    }
}

export const AdyenExpressCheckoutContext = React.createContext({})

const initialState = {
    adyenEnvironment: null,
    adyenPaymentMethods: null,
    shippingMethods: null
}

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_ADYEN_ENVIRONMENT':
            return {...state, adyenEnvironment: action.payload}
        case 'SET_ADYEN_PAYMENT_METHODS':
            return {...state, adyenPaymentMethods: action.payload}
        case 'SET_SHIPPING_METHODS':
            return {...state, shippingMethods: action.payload}
        default:
            return state
    }
}

export const AdyenExpressCheckoutProvider = ({
                                                 children,
                                                 authToken,
                                                 customerId,
                                                 locale,
                                                 site,
                                                 basket,
                                                 navigate
                                             }) => {
    const [state, dispatch] = useReducer(reducer, initialState)
    const {adyenEnvironment, adyenPaymentMethods, shippingMethods} = state
    const basketId = basket?.basketId

    useEffect(() => {
        const fetchAdyenData = async () => {
            if (!authToken) {
                return
            }
            const [environment, paymentMethods] = await Promise.all([
                _fetchEnvironment(customerId, basketId, site, authToken),
                _fetchPaymentMethods(customerId, basketId, site, locale, authToken)
            ])
            dispatch({type: 'SET_ADYEN_ENVIRONMENT', payload: environment || {error: true}})
            dispatch({type: 'SET_ADYEN_PAYMENT_METHODS', payload: paymentMethods || {error: true}})
        }

        fetchAdyenData()
    }, [authToken, customerId, locale?.id, site?.id, basketId])

    const fetchShippingMethods = useCallback(async () => {
        if (!basketId || !authToken) {
            return null
        }
        const methods = await _fetchShippingMethods(customerId, basketId, site, authToken)
        dispatch({type: 'SET_SHIPPING_METHODS', payload: methods || {error: true}})
        return methods
    }, [basketId, customerId, site, authToken])

    useEffect(() => {
        if (basketId) {
            fetchShippingMethods()
        }
    }, [basketId, fetchShippingMethods])

    const value = useMemo(
        () => ({
            adyenEnvironment,
            adyenPaymentMethods,
            shippingMethods,
            basket,
            locale,
            site,
            authToken,
            navigate,
            fetchShippingMethods
        }),
        [
            adyenEnvironment,
            adyenPaymentMethods,
            shippingMethods,
            basket,
            locale,
            site,
            authToken,
            navigate,
            fetchShippingMethods
        ]
    )

    return (
        <AdyenExpressCheckoutContext.Provider value={value}>
            {children}
        </AdyenExpressCheckoutContext.Provider>
    )
}

AdyenExpressCheckoutProvider.propTypes = {
    children: PropTypes.any,
    authToken: PropTypes.string,
    customerId: PropTypes.string,
    locale: PropTypes.object,
    site: PropTypes.object,
    basket: PropTypes.object,
    navigate: PropTypes.func
}

export default AdyenExpressCheckoutProvider
