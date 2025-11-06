import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {executeCallbacks, executeErrorCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {PaymentCancelService} from '../../services/payment-cancel'

export const baseConfig = ({
    beforeSubmit = [],
    afterSubmit = [],
    beforeAdditionalDetails = [],
    afterAdditionalDetails = [],
    onError = [],
    ...props
}) => {
    const onErrorCallback = executeErrorCallbacks(onError)
    return {
        amount: getAmount(props),
        onSubmit: executeCallbacks(
            [...beforeSubmit, onSubmit, ...afterSubmit],
            props,
            onErrorCallback
        ),
        onAdditionalDetails: executeCallbacks(
            [...beforeAdditionalDetails, onAdditionalDetails, ...afterAdditionalDetails],
            props,
            onErrorCallback
        ),
        onError: executeCallbacks([...onError, onErrorHandler], props, onErrorCallback)
    }
}

export const onSubmit = async (state, component, actions, props) => {
    try {
        if (!state.isValid) {
            throw new Error('invalid state')
        }
        const adyenPaymentService = new AdyenPaymentsService(
            props?.token,
            props?.customerId,
            props.basket?.basketId,
            props?.site
        )
        const paymentsResponse = await adyenPaymentService.submitPayment({
            ...state.data,
            origin: state.data.origin ? state.data.origin : window.location.origin,
            returnUrl: props?.returnUrl || `${window.location.href}/redirect`
        })
        const adyenPaymentService = new AdyenPaymentsService(
            props?.token,
            props?.customerId,
            props.basket?.basketId,
            props?.site
        )
        const paymentsResponse = await adyenPaymentService.submitPayment({
            ...state.data,
            origin: state.data.origin ? state.data.origin : window.location.origin,
            returnUrl: props?.returnUrl || `${window.location.href}/redirect`
        })
        return {paymentsResponse: paymentsResponse}
    } catch (err) {
        actions.reject()
        throw err
    }
}

export const onAdditionalDetails = async (state, component, actions, props) => {
    try {
        const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(
            props?.token,
            props?.customerId,
            props.basket?.basketId,
            props?.site
        )
        const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(
            props?.token,
            props?.customerId,
            props.basket?.basketId,
            props?.site
        )
        const paymentsDetailsResponse = await adyenPaymentsDetailsService.submitPaymentsDetails(
            state.data
        )
        return {paymentsDetailsResponse: paymentsDetailsResponse}
    } catch (err) {
        actions.reject()
        throw err
    }
}

export const onErrorHandler = async (error, component, props) => {
    const paymentCancelService = new PaymentCancelService(
        props?.token,
        props?.customerId,
        props.basket?.basketId,
        props?.site
    )
    await paymentCancelService.paymentCancel(props?.orderNo)
    if (props?.adyenOrder) {
        props?.setAdyenOrder(null)
    }
    props?.navigate('/checkout')
}

export const getAmount = ({basket, adyenOrder}) => {
    if (!basket) return null
    if (adyenOrder) {
        return adyenOrder.remainingAmount
    }
    return {
        value: getCurrencyValueForApi(basket.orderTotal, basket.currency),
        currency: basket.currency
    }
}
