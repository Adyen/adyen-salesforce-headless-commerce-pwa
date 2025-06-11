import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'

export const baseConfig = ({
    beforeSubmit = [],
    afterSubmit = [],
    beforeAdditionalDetails = [],
    afterAdditionalDetails = [],
    onError = () => {
        window.location.reload()
    },
    ...props
}) => {
    return {
        amount: getAmount(props),
        onSubmit: executeCallbacks([...beforeSubmit, onSubmit, ...afterSubmit], props, onError),
        onAdditionalDetails: executeCallbacks(
            [...beforeAdditionalDetails, onAdditionalDetails, ...afterAdditionalDetails],
            props,
            onError
        )
    }
}

export const onSubmit = async (state, component, props) => {
    if (!state.isValid) {
        throw new Error('invalid state')
    }
    const adyenPaymentService = new AdyenPaymentsService(props?.token, props?.site)
    const paymentsResponse = await adyenPaymentService.submitPayment(
        {
            ...state.data,
            origin: state.data.origin ? state.data.origin : window.location.origin,
            returnUrl: props?.returnUrl || `${window.location.href}/redirect`
        },
        props.basket?.basketId,
        props?.customerId
    )
    return {paymentsResponse: paymentsResponse}
}

export const onAdditionalDetails = async (state, component, props) => {
    const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(props?.token, props?.site)
    const paymentsDetailsResponse = await adyenPaymentsDetailsService.submitPaymentsDetails(
        state.data,
        props?.customerId
    )
    return {paymentsDetailsResponse: paymentsDetailsResponse}
}

export const getAmount = ({basket}) => {
    if (!basket) return null
    return {
        value: getCurrencyValueForApi(basket.orderTotal, basket.currency),
        currency: basket.currency
    }
}
