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
