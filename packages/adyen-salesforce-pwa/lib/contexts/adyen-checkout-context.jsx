import React, {useCallback, useEffect, useMemo, useReducer} from 'react'
import PropTypes from 'prop-types'
import usePaymentMethodsConfiguration from '../hooks/usePaymentMethodsConfiguration'
import useAdyenEnvironment from '../hooks/useAdyenEnvironment'
import useAdyenPaymentMethods from '../hooks/useAdyenPaymentMethods'

export const AdyenCheckoutContext = React.createContext({})

const initialState = {
    adyenPaymentMethods: null,
    adyenEnvironment: null,
    adyenStateData: null,
    adyenOrder: null,
    isLoading: false,
    orderNo: null,
    adyenAction: null,
    redirectResult: null,
    amazonCheckoutSessionId: null
}

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_ADYEN_PAYMENT_METHODS':
            return {...state, adyenPaymentMethods: action.payload}
        case 'SET_ADYEN_ENVIRONMENT':
            return {...state, adyenEnvironment: action.payload}
        case 'SET_ADYEN_STATE_DATA':
            return {...state, adyenStateData: action.payload}
        case 'SET_ADYEN_ORDER':
            return {...state, adyenOrder: action.payload}
        case 'SET_IS_LOADING':
            return {...state, isLoading: action.payload}
        case 'SET_ORDER_NO':
            return {...state, orderNo: action.payload}
        case 'SET_ADYEN_ACTION':
            return {...state, adyenAction: action.payload}
        case 'SET_REDIRECT_RESULT':
            return {...state, redirectResult: action.payload}
        case 'SET_AMAZON_CHECKOUT_SESSION_ID':
            return {...state, amazonCheckoutSessionId: action.payload}
        default:
            return state
    }
}

const AdyenCheckoutProvider = ({
    children,
    authToken,
    customerId,
    isCustomerRegistered,
    locale,
    site,
    adyenConfig,
    navigate,
    basket,
    returnUrl,
    page
}) => {
    const [state, dispatch] = useReducer(reducer, initialState)
    const {adyenOrder, orderNo} = state
    const callPaymentMethodsOnPages = ['checkout']

    const {
        dropinConfiguration: optionalDropinConfiguration,
        paymentMethodsConfiguration: additionalPaymentMethodsConfiguration,
        onError: adyenOnError,
        afterSubmit: adyenAfterSubmit,
        beforeSubmit: adyenBeforeSubmit,
        afterAdditionalDetails: adyenAfterAdditionalDetails,
        beforeAdditionalDetails: adyenBeforeAdditionalDetails,
        translations: adyenTranslations
    } = adyenConfig || {}
    const localeId = locale?.id

    const {data: adyenEnvironment, error: adyenEnvironmentError} = useAdyenEnvironment({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site,
        skip: !!state.adyenEnvironment // Skip if already fetched
    })

    useEffect(() => {
        if (adyenEnvironment || adyenEnvironmentError) {
            const payload = adyenEnvironment || {error: adyenEnvironmentError || true}
            dispatch({type: 'SET_ADYEN_ENVIRONMENT', payload})
        }
    }, [adyenEnvironment, adyenEnvironmentError])

    const {
        data: adyenPaymentMethods,
        error: adyenPaymentMethodsError,
        isLoading: fetchingPaymentMethods
    } = useAdyenPaymentMethods({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site,
        locale,
        skip: !!state.adyenPaymentMethods || !callPaymentMethodsOnPages.includes(page)
    })

    useEffect(() => {
        if (adyenPaymentMethods || adyenPaymentMethodsError) {
            const payload = adyenPaymentMethods || {error: adyenPaymentMethodsError || true}
            dispatch({type: 'SET_ADYEN_PAYMENT_METHODS', payload})
        }
    }, [adyenPaymentMethods, adyenPaymentMethodsError])

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const redirectResult = urlParams.get('redirectResult')
        const amazonCheckoutSessionId = urlParams.get('amazonCheckoutSessionId')
        const adyenActionFromUrl = urlParams.get('adyenAction')
        dispatch({type: 'SET_REDIRECT_RESULT', payload: redirectResult})
        dispatch({type: 'SET_AMAZON_CHECKOUT_SESSION_ID', payload: amazonCheckoutSessionId})
        dispatch({type: 'SET_ADYEN_ACTION', payload: adyenActionFromUrl})
    }, [])

    useEffect(() => {
        if (basket?.c_orderData) {
            const c_orderData = JSON.parse(basket.c_orderData)
            if (c_orderData?.orderData && c_orderData?.orderData !== state.adyenOrder?.orderData) {
                dispatch({type: 'SET_ADYEN_ORDER', payload: c_orderData})
            }
        }
    }, [basket?.c_orderData])

    const setIsLoading = useCallback(
        (data) => dispatch({type: 'SET_IS_LOADING', payload: data}),
        [dispatch]
    )
    const setAdyenStateData = useCallback(
        (data) => dispatch({type: 'SET_ADYEN_STATE_DATA', payload: data}),
        [dispatch]
    )

    const setAdyenOrder = useCallback(
        (data) => dispatch({type: 'SET_ADYEN_ORDER', payload: data}),
        [dispatch]
    )

    const setAdyenAction = useCallback(
        (data) => dispatch({type: 'SET_ADYEN_ACTION', payload: data}),
        [dispatch]
    )

    const setOrderNo = useCallback(
        (data) => dispatch({type: 'SET_ORDER_NO', payload: data}),
        [dispatch]
    )

    const paymentMethodsConfigProps = useMemo(
        () => ({
            adyenPaymentMethods: state.adyenPaymentMethods,
            adyenOrder,
            orderNo,
            isCustomerRegistered,
            token: authToken,
            site,
            basket,
            returnUrl,
            customerId,
            setAdyenOrder,
            setAdyenAction,
            setOrderNo,
            setIsLoading,
            navigate,
            adyenConfig
        }),
        [
            state.adyenPaymentMethods,
            adyenOrder,
            isCustomerRegistered,
            authToken,
            site,
            basket,
            returnUrl,
            customerId,
            setAdyenOrder,
            setAdyenAction,
            setOrderNo,
            setIsLoading,
            navigate,
            adyenConfig
        ]
    )

    const getPaymentMethodsConfiguration = usePaymentMethodsConfiguration(paymentMethodsConfigProps)

    const getTranslations = useCallback(() => {
        return adyenTranslations && adyenTranslations[localeId] ? adyenTranslations : null
    }, [adyenTranslations, localeId])

    const value = useMemo(
        () => ({
            ...state,
            fetchingPaymentMethods,
            locale,
            navigate,
            optionalDropinConfiguration,
            setIsLoading,
            setAdyenOrder,
            setAdyenAction,
            setOrderNo,
            setAdyenStateData,
            getPaymentMethodsConfiguration,
            getTranslations
        }),
        [
            state,
            fetchingPaymentMethods,
            locale,
            navigate,
            optionalDropinConfiguration,
            setIsLoading,
            setAdyenOrder,
            setAdyenAction,
            setOrderNo,
            setAdyenStateData,
            getPaymentMethodsConfiguration,
            getTranslations
        ]
    )

    return <AdyenCheckoutContext.Provider value={value}>{children}</AdyenCheckoutContext.Provider>
}

AdyenCheckoutProvider.propTypes = {
    children: PropTypes.any,
    authToken: PropTypes.string,
    customerId: PropTypes.string,
    isCustomerRegistered: PropTypes.bool,
    locale: PropTypes.any,
    site: PropTypes.any,
    adyenConfig: PropTypes.any,
    navigate: PropTypes.any,
    basket: PropTypes.any,
    returnUrl: PropTypes.string,
    page: PropTypes.oneOf(['checkout', 'confirmation', 'redirect'])
}

export default AdyenCheckoutProvider
