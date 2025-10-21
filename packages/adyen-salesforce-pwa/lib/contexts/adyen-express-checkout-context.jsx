import React, {useCallback, useEffect, useMemo, useReducer} from 'react'
import PropTypes from 'prop-types'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import useAdyenShippingMethods from '../hooks/useAdyenShippingMethods'

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
    const basketId = basket?.basketId

    const {data: adyenEnvironment, error: adyenEnvironmentError} = useAdyenEnvironment({
        authToken,
        customerId,
        basketId,
        site,
        skip: !!state.adyenEnvironment
    })

    useEffect(() => {
        if (adyenEnvironment || adyenEnvironmentError) {
            const payload = adyenEnvironment || {error: adyenEnvironmentError || true}
            dispatch({type: 'SET_ADYEN_ENVIRONMENT', payload})
        }
    }, [adyenEnvironment, adyenEnvironmentError])

    const {data: adyenPaymentMethods, error: adyenPaymentMethodsError} = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId,
        site,
        locale,
        skip: !!state.adyenPaymentMethods
    })

    useEffect(() => {
        if (adyenPaymentMethods || adyenPaymentMethodsError) {
            const payload = adyenPaymentMethods || {error: adyenPaymentMethodsError || true}
            dispatch({type: 'SET_ADYEN_PAYMENT_METHODS', payload})
        }
    }, [adyenPaymentMethods, adyenPaymentMethodsError])

    const {data: shippingMethods, error: shippingMethodsError} = useAdyenShippingMethods({
        authToken,
        customerId,
        basketId,
        site,
        skip: !basketId
    })

    useEffect(() => {
        if (shippingMethods || shippingMethodsError) {
            const payload = shippingMethods || {error: shippingMethodsError || true}
            dispatch({type: 'SET_SHIPPING_METHODS', payload})
        }
    }, [shippingMethods, shippingMethodsError])

    const fetchShippingMethods = useCallback(async () => {
        return state.shippingMethods
    }, [state.shippingMethods])

    const value = useMemo(
        () => ({
            ...state,
            basket,
            locale,
            site,
            authToken,
            navigate,
            fetchShippingMethods
        }),
        [state, basket, locale, site, authToken, navigate, fetchShippingMethods]
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
