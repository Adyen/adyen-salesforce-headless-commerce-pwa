import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
import {executeCallbacks, executeErrorCallbacks} from '../../utils/executeCallbacks'
import {getCurrencyValueForApi} from '../../utils/parsers.mjs'
import {PaymentCancelService} from '../../services/payment-cancel'

export const baseConfig = (props) => {
    const {
        beforeSubmit = [],
        afterSubmit = [],
        beforeAdditionalDetails = [],
        afterAdditionalDetails = [],
        onError = []
    } = props
    // Create error handler with props in closure
    const errorHandler = (error, component) => onErrorHandler(error, component, props)

    return {
        amount: getAmount(props),
        onSubmit: executeCallbacks(
            [...beforeSubmit, onSubmit, ...afterSubmit, onPaymentsSuccess],
            props
        ),
        onAdditionalDetails: executeCallbacks(
            [
                ...beforeAdditionalDetails,
                onAdditionalDetails,
                ...afterAdditionalDetails,
                onPaymentsDetailsSuccess
            ],
            props
        ),
        onError: executeErrorCallbacks([...onError, errorHandler], props),
        onPaymentFailed: executeErrorCallbacks([...onError, errorHandler], props)
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
            origin: state.data.origin || window.location.origin,
            returnUrl: props?.returnUrl || `${window.location.href}/redirect`
        })

        return {paymentsResponse: paymentsResponse}
    } catch (err) {
        actions.reject(err.message)
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
        const paymentsDetailsResponse = await adyenPaymentsDetailsService.submitPaymentsDetails(
            state.data
        )
        return {paymentsDetailsResponse: paymentsDetailsResponse}
    } catch (err) {
        actions.reject(err.message)
        if (state?.data?.details?.redirectResult || state?.data?.details?.threeDSResult) {
            executeErrorCallbacks([...props.onError, onErrorHandler], props)(err, component)
        }
    }
}

export const onErrorHandler = async (error, component, props) => {
    try {
        const paymentCancelService = new PaymentCancelService(
            props.token,
            props.customerId,
            props.basket?.basketId,
            props.site
        )
        await paymentCancelService.paymentCancel(props.orderNo)
        if (props.adyenOrder) {
            props.setAdyenOrder(null)
        }
        props.navigate(`/checkout?error=true`)
        return {cancelled: true}
    } catch (err) {
        console.error('Error during payment cancellation:', err)
        return {cancelled: false, error: err.message}
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

const handleAction = (navigate, setAdyenAction, component, response) => {
    const {action, merchantReference} = response
    const actionURI = btoa(JSON.stringify(action))
    const url = `/checkout/confirmation/${merchantReference}?adyenAction=${actionURI}`
    switch (action.type) {
        case 'voucher':
            navigate(url)
            break
        case 'threeDS2':
            setAdyenAction(actionURI)
            break
        default:
            component.handleAction(action)
            break
    }
}

export const onPaymentsSuccess = async (state, component, actions, props, responses) => {
    if (responses?.paymentsResponse?.merchantReference) {
        if (props?.orderNo !== responses?.paymentsResponse?.merchantReference) {
            props?.setOrderNo(responses?.paymentsResponse?.merchantReference)
        }
    }
    if (responses?.paymentsResponse?.order?.orderData) {
        // Only update the order if it's different from the one in the state to prevent re-renders.
        if (props.adyenOrder?.orderData !== responses?.paymentsResponse?.order?.orderData) {
            props?.setAdyenOrder(responses?.paymentsResponse?.order)
        }
    }
    if (responses?.paymentsResponse?.isSuccessful && responses?.paymentsResponse?.isFinal) {
        if (responses?.paymentsResponse?.order) {
            if (responses?.paymentsResponse?.order?.remainingAmount?.value <= 0) {
                props?.navigate(
                    `/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}`
                )
            }
        } else {
            props?.navigate(
                `/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}`
            )
        }
    } else if (responses?.paymentsResponse?.action) {
        handleAction(props?.navigate, props?.setAdyenAction, component, responses?.paymentsResponse)
    }
    actions.resolve(responses?.paymentsResponse)
}

export const onPaymentsDetailsSuccess = async (state, component, actions, props, responses) => {
    if (responses?.paymentsDetailsResponse?.isSuccessful) {
        props?.navigate(
            `/checkout/confirmation/${responses?.paymentsDetailsResponse?.merchantReference}`
        )
    } else if (responses?.paymentsDetailsResponse?.action) {
        handleAction(
            props?.navigate,
            props?.setAdyenAction,
            component,
            responses?.paymentsDetailsResponse
        )
    }
    actions.resolve(responses?.paymentsDetailsResponse)
}
