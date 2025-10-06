import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {PaymentCancelService} from '../../services/payment-cancel'

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
        return {paymentsDetailsResponse: paymentsDetailsResponse}
    } catch (err) {
        actions.reject()
        throw new Error(err)
    }

}

export const onErrorHandler = async (orderNo, navigate, props) => {
    try {
        const paymentCancelService = new PaymentCancelService(props?.token, props?.customerId, props.basket?.basketId, props?.site);
        const response = await paymentCancelService.paymentCancel(orderNo);
        if (props?.adyenOrder) {
            props?.setAdyenOrder(null)
        }
        props?.onNavigate('/checkout');
    } catch (err) {
        throw new Error(err)
    }
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
