import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'

export const baseConfig = ({
    beforeSubmit = [],
    afterSubmit = [],
    beforeAdditionalDetails = [],
    afterAdditionalDetails = [],
    onError = (error) => {
        console.log(JSON.stringify(error))
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
    try {
        if (!state.isValid) {
            throw new Error('invalid state')
        }
        const adyenPaymentService = new AdyenPaymentsService(props?.token)
        const paymentsResponse = await adyenPaymentService.submitPayment(
            {...state.data, origin: `${window.location.protocol}//${window.location.host}`},
            props.basketId,
            props?.customerId
        )
        return {paymentsResponse: paymentsResponse}
    } catch (error) {
        return new Error(error)
    }
}

export const onAdditionalDetails = async (state, component, props) => {
    try {
        const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(props?.token)
        const paymentsDetailsResponse = await adyenPaymentsDetailsService.submitPaymentsDetails(
            state.data,
            props?.customerId
        )
        return {paymentsDetailsResponse: paymentsDetailsResponse}
    } catch (error) {
        return new Error(error)
    }
}

export const getAmount = ({basket}) => {
    if (!basket) return null
    return {
        value: getCurrencyValueForApi(basket.orderTotal, basket.currency),
        currency: basket.currency
    }
}
