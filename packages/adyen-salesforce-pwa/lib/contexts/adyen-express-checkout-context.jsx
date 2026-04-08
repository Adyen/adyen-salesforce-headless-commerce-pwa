import React, {useCallback, useEffect, useMemo, useReducer} from 'react'
import PropTypes from 'prop-types'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'
import useAdyenShippingMethods from '../hooks/useAdyenShippingMethods'

export const AdyenExpressCheckoutContext = React.createContext({})

const initialState = {}

const reducer = (state, action) => {
    switch (action.type) {
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
        site
    })

    const {data: adyenPaymentMethods, error: adyenPaymentMethodsError} = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId,
        site,
        locale,
        basket
    })

    const {data: shippingMethods, error: shippingMethodsError} = useAdyenShippingMethods({
        authToken,
        customerId,
        basketId,
        site
    })

    const fetchShippingMethods = useCallback(async () => {
        return shippingMethods
    }, [shippingMethods])

    const value = useMemo(
        () => ({
            ...state,
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
            state,
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
