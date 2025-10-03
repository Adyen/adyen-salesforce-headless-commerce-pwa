import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {AdyenOrderService} from "../../services/order";

export const baseConfig = ({
                               beforeSubmit = [],
                               afterSubmit = [],
                               beforeAdditionalDetails = [],
                               afterAdditionalDetails = [],
                               onError = () => {
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
        ),
        onError: executeCallbacks([onErrorHandler], props, onError),
    }
}

export const onSubmit = async (state, component, actions, props) => {
    try {
        if (!state.isValid) {
            throw new Error('invalid state')
        }
        const adyenPaymentService = new AdyenPaymentsService(props?.token, props?.customerId, props.basket?.basketId, props?.site)
        const paymentsResponse = await adyenPaymentService.submitPayment(
            {
                ...state.data,
                origin: state.data.origin ? state.data.origin : window.location.origin,
                returnUrl: props?.returnUrl || `${window.location.href}/redirect`
            }
        )
        actions.resolve(paymentsResponse)
        return {paymentsResponse: paymentsResponse}
    } catch (err) {
        actions.reject()
        throw new Error(err)
    }

}

export const onAdditionalDetails = async (state, component, actions, props) => {
    try {
        const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(props?.token, props?.customerId, props.basket?.basketId, props?.site)
        const paymentsDetailsResponse = await adyenPaymentsDetailsService.submitPaymentsDetails(
            state.data
        )
        actions.resolve(paymentsDetailsResponse)
        return {paymentsDetailsResponse: paymentsDetailsResponse}
    } catch (err) {
        actions.reject()
        throw new Error(err)
    }

}

export const onErrorHandler = async (orderNo, navigate, props) => {
    const adyenOrderService = new AdyenOrderService(props?.token, props?.customerId, props.basket?.basketId, props?.site);
    const response = await adyenOrderService.orderCancel(orderNo);
    navigate(response?.headers?.location);
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
