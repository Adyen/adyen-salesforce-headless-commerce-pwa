import React, {useCallback, useEffect, useMemo, useReducer} from 'react'
import PropTypes from 'prop-types'
import {AdyenPaymentMethodsService} from '../services/payment-methods'
import {paymentMethodsConfiguration as getPaymentMethodsConfig} from '../components/paymentMethodsConfiguration'
import {AdyenEnvironmentService} from '../services/environment'
import {onPaymentsDetailsSuccess, onPaymentsSuccess} from './helper'

export const AdyenCheckoutContext = React.createContext({})

const initialState = {
    adyenPaymentMethods: null,
    adyenEnvironment: null,
    adyenStateData: null,
    adyenOrder: null,
    checkoutDropin: null,
    adyenPaymentInProgress: false,
    fetchingPaymentMethods: false,
    orderNo: null
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
        case 'SET_CHECKOUT_DROPIN':
            return {...state, checkoutDropin: action.payload}
        case 'SET_ADYEN_PAYMENT_IN_PROGRESS':
            return {...state, adyenPaymentInProgress: action.payload}
        case 'SET_FETCHING_PAYMENT_METHODS':
            return {...state, fetchingPaymentMethods: action.payload}
        case 'SET_ORDER_NO':
            return {...state, orderNo: action.payload}
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
    const {adyenPaymentMethods, fetchingPaymentMethods, adyenOrder} = state
    const callPaymentMethodsOnPages = ['checkout']

    const {
        paymentMethodsConfiguration: additionalPaymentMethodsConfiguration,
        onError: adyenOnError,
        afterSubmit: adyenAfterSubmit,
        beforeSubmit: adyenBeforeSubmit,
        afterAdditionalDetails: adyenAfterAdditionalDetails,
        beforeAdditionalDetails: adyenBeforeAdditionalDetails,
        translations: adyenTranslations
    } = adyenConfig || {}
    const localeId = locale?.id

    useEffect(() => {
        const fetchInitialData = async () => {
            // Fetch environment
            const adyenEnvironmentService = new AdyenEnvironmentService(authToken, site)
            try {
                const data = await adyenEnvironmentService.fetchEnvironment()
                dispatch({type: 'SET_ADYEN_ENVIRONMENT', payload: data ? data : {error: true}})
            } catch (error) {
                dispatch({type: 'SET_ADYEN_ENVIRONMENT', payload: {error}})
            }

            // Fetch payment methods
            if (
                !adyenPaymentMethods &&
                !fetchingPaymentMethods &&
                callPaymentMethodsOnPages.includes(page)
            ) {
                dispatch({type: 'SET_FETCHING_PAYMENT_METHODS', payload: true})
                const adyenPaymentMethodsService = new AdyenPaymentMethodsService(authToken, site)
                try {
                    const data = await adyenPaymentMethodsService.fetchPaymentMethods(
                        customerId,
                        locale
                    )
                    dispatch({
                        type: 'SET_ADYEN_PAYMENT_METHODS',
                        payload: data ? data : {error: true}
                    })
                } catch (error) {
                    dispatch({type: 'SET_ADYEN_PAYMENT_METHODS', payload: {error}})
                } finally {
                    dispatch({type: 'SET_FETCHING_PAYMENT_METHODS', payload: false})
                }
            }
        }

        fetchInitialData()
    }, [
        authToken,
        site,
        customerId,
        localeId,
        page,
        adyenPaymentMethods,
        fetchingPaymentMethods,
        locale
    ])

    useEffect(() => {
        if (basket?.c_orderData) {
            dispatch({type: 'SET_ADYEN_ORDER', payload: JSON.parse(basket.c_orderData)})
        }
    }, [basket?.c_orderData])

    const setAdyenPaymentInProgress = useCallback(
        (data) => dispatch({type: 'SET_ADYEN_PAYMENT_IN_PROGRESS', payload: data}),
        [dispatch]
    )
    const setAdyenStateData = useCallback(
        (data) => dispatch({type: 'SET_ADYEN_STATE_DATA', payload: data}),
        [dispatch]
    )
    const setCheckoutDropin = useCallback(
        (data) => dispatch({type: 'SET_CHECKOUT_DROPIN', payload: data}),
        [dispatch]
    )

    const setAdyenOrder = useCallback(
        (data) => dispatch({type: 'SET_ADYEN_ORDER', payload: data}),
        [dispatch]
    )

    const setOrderNo = useCallback(
        (data) => dispatch({type: 'SET_ORDER_NO', payload: data}),
        [dispatch]
    )

    const getTranslations = useCallback(() => {
        return adyenTranslations && adyenTranslations[localeId] ? adyenTranslations : null
    }, [adyenTranslations, localeId])

    const getPaymentMethodsConfiguration = useCallback(
        async ({
                   beforeSubmit = [],
                   afterSubmit = [],
                   beforeAdditionalDetails = [],
                   afterAdditionalDetails = [],
                   onError
               }) => {
            return getPaymentMethodsConfig({
                additionalPaymentMethodsConfiguration,
                paymentMethods: adyenPaymentMethods?.paymentMethods,
                isCustomerRegistered,
                token: authToken,
                site,
                basket,
                adyenOrder,
                returnUrl,
                customerId,
                setAdyenOrder,
                setOrderNo,
                onError: adyenOnError || onError,
                onNavigate: navigate,
                afterSubmit: [
                    ...afterSubmit,
                    ...(adyenAfterSubmit || []),
                    onPaymentsSuccess(
                        navigate,
                        setOrderNo,
                        setAdyenOrder
                    )
                ],
                beforeSubmit: [...beforeSubmit, ...(adyenBeforeSubmit || [])],
                afterAdditionalDetails: [
                    ...afterAdditionalDetails,
                    ...(adyenAfterAdditionalDetails || []),
                    onPaymentsDetailsSuccess(navigate)
                ],
                beforeAdditionalDetails: [
                    ...beforeAdditionalDetails,
                    ...(adyenBeforeAdditionalDetails || [])
                ]
            })
        },
        [
            additionalPaymentMethodsConfiguration,
            adyenOnError,
            adyenAfterSubmit,
            adyenBeforeSubmit,
            adyenAfterAdditionalDetails,
            adyenBeforeAdditionalDetails,
            adyenPaymentMethods,
            adyenOrder,
            isCustomerRegistered,
            authToken,
            site,
            basket,
            returnUrl,
            customerId,
            navigate,
            dispatch
        ]
    )

    const value = useMemo(
        () => ({
            ...state,
            locale,
            navigate,
            setAdyenPaymentInProgress,
            setAdyenStateData,
            setCheckoutDropin,
            getPaymentMethodsConfiguration,
            getTranslations
        }),
        [
            state,
            locale,
            navigate,
            setAdyenPaymentInProgress,
            setAdyenStateData,
            setCheckoutDropin,
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
