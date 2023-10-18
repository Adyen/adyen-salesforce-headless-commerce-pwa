import {AdyenPaymentsService} from '../../services/payments'
import {AdyenPaymentsDetailsService} from '../../services/payments-details'
export const baseConfig = (props) => {
    const onSubmit = async (state, component) => {
        try {
            if (!state.isValid) throw new Error('invalid state')
            const adyenPaymentService = new AdyenPaymentsService(props.token)
            const paymentsResponse = await adyenPaymentService.submitPayment(
                state.data,
                props.basketId,
                props.customerId
            )
            if (paymentsResponse?.isSuccessful) {
                props.successHandler(paymentsResponse.merchantReference)
            } else if (paymentsResponse?.action) {
                await component.handleAction(paymentsResponse.action)
            }
        } catch (error) {
            props.errorHandler(error)
        }
    }
    const onAdditionalDetails = async (state, component) => {
        try {
            if (!state.isValid) throw new Error('invalid state')
            const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(props.token)
            const paymentsDetailsResponse = await adyenPaymentsDetailsService.submitPaymentsDetails(
                state.data,
                props.customerId
            )
            if (paymentsDetailsResponse?.isSuccessful) {
                props.successHandler(paymentsDetailsResponse.merchantReference)
            } else if (paymentsDetailsResponse?.action) {
                await component.handleAction(paymentsDetailsResponse.action)
            }
        } catch (error) {
            props.errorHandler(error)
        }
    }

    return {
        onSubmit: onSubmit,
        onAdditionalDetails: onAdditionalDetails
    }
}
