import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {AdyenOrderService} from "../../services/order";
import {GiftCardService} from '../../services/giftCard'

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
        ),
        onError: executeCallbacks([onErrorHandler], props, onError),
        onOrderCancel: executeCallbacks([onOrderCancelHandler], props, onError),
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
        props.basket?.basketId,
        props?.customerId
    )
    return {paymentsDetailsResponse: paymentsDetailsResponse}
}

export const onErrorHandler = async (orderNo, navigate, props) => {
    const adyenOrderService = new AdyenOrderService(props?.token, props?.site);
    const response = await adyenOrderService.orderCancel(orderNo, props?.customerId);
    navigate(response?.headers?.location);
}

export const onOrderCancelHandler = async (Order, props) => {
    const giftCardService = new GiftCardService(props?.token, props?.site)
    await giftCardService.cancelOrder(Order, props?.customerId)
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
