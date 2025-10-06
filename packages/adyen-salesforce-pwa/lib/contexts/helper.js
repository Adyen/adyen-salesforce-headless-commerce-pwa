const handleAction = (navigate) => async (component, responses) => {
    if (responses?.paymentsResponse?.action?.type === 'voucher') {
        const action = btoa(JSON.stringify(responses?.paymentsResponse?.action))
        const url = `/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}?adyenAction=${action}`
        navigate(url)
    } else {
        const action = btoa(JSON.stringify(responses?.paymentsResponse?.action))
        const url = `/checkout?adyenAction=${action}`
        navigate(url)
    }
}

export const onPaymentsSuccess = (navigate, setOrderNo, setAdyenOrder) => async (state, component, actions, props, responses) => {
    if (responses?.paymentsResponse?.merchantReference) {
        setOrderNo(responses?.paymentsResponse?.merchantReference)
    }
    if (responses?.paymentsResponse?.order?.orderData) {
        setAdyenOrder(responses?.paymentsResponse?.order)
    }
    if (responses?.paymentsResponse?.isSuccessful && responses?.paymentsResponse?.isFinal) {
        if (responses?.paymentsResponse?.order) {
            if (responses?.paymentsResponse?.order?.remainingAmount?.value <= 0) {
                navigate(`/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}`)
            }
        } else {
            navigate(`/checkout/confirmation/${responses?.paymentsResponse?.merchantReference}`)
        }
    } else if (responses?.paymentsResponse?.action) {
        await handleAction(navigate)(component, responses)
    }
    actions.resolve(responses?.paymentsResponse)
}

export const onPaymentsDetailsSuccess =
    (navigate) => async (state, component, actions, props, responses) => {
        if (responses?.paymentsDetailsResponse?.isSuccessful) {
            navigate(
                `/checkout/confirmation/${responses?.paymentsDetailsResponse?.merchantReference}`
            )
        } else if (responses?.paymentsDetailsResponse?.action) {
            await component.handleAction(responses?.paymentsDetailsResponse?.action)
        }
        actions.resolve(responses?.paymentsDetailsResponse)
    }
