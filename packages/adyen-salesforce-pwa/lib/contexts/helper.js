const handleAction = (navigate, setAdyenAction) => async (component, responses) => {
    if (responses?.paymentsResponse?.action?.type === 'voucher') {
        const action = btoa(JSON.stringify(responses?.paymentsResponse?.action))
        const url = `/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}?adyenAction=${action}`
        navigate(url)
    } else {
        const action = btoa(JSON.stringify(responses?.paymentsResponse?.action))
        component.handleAction(responses?.paymentsResponse?.action)
        // setAdyenAction(action)
    }
}

export const onPaymentsSuccess = async (state, component, actions, props, responses) => {
    if (responses?.paymentsResponse?.merchantReference) {
        props?.setOrderNo(responses?.paymentsResponse?.merchantReference)
    }
    if (responses?.paymentsResponse?.order?.orderData) {
        props?.setAdyenOrder(responses?.paymentsResponse?.order)
    }
    if (responses?.paymentsResponse?.isSuccessful && responses?.paymentsResponse?.isFinal) {
        if (responses?.paymentsResponse?.order) {
            if (responses?.paymentsResponse?.order?.remainingAmount?.value <= 0) {
                props?.navigate(`/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}`)
            }
        } else {
            props?.navigate(`/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}`)
        }
    } else if (responses?.paymentsResponse?.action) {
        await handleAction(props?.navigate, props?.setAdyenAction)(component, responses)
    }
    actions.resolve(responses?.paymentsResponse)
}

export const onPaymentsDetailsSuccess =
    async (state, component, actions, props, responses) => {
        if (responses?.paymentsDetailsResponse?.isSuccessful) {
            props?.navigate(
                `/checkout/confirmation/${responses?.paymentsDetailsResponse?.merchantReference}`
            )
        } else if (responses?.paymentsDetailsResponse?.action) {
            const action = btoa(JSON.stringify(responses?.paymentsResponse?.action))
            props?.setAdyenAction(action)
        }
        actions.resolve(responses?.paymentsDetailsResponse)
    }
