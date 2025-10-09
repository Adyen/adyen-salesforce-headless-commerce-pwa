import {useCallback} from 'react'
import {paymentMethodsConfiguration as getPaymentMethodsConfig} from '../components/paymentMethodsConfiguration'
import {onPaymentsDetailsSuccess, onPaymentsSuccess} from '../contexts/helper'

/**
 * A hook to create the Adyen payment methods configuration object.
 * It encapsulates the logic for assembling callbacks and properties
 * needed by the Adyen Web Drop-in.
 *
 * @param {object} props
 * @returns {function} A function that, when called, returns the payment methods configuration.
 */
const usePaymentMethodsConfiguration = (props) => {
    const {
        adyenPaymentMethods,
        adyenOrder,
        isCustomerRegistered,
        token,
        site,
        basket,
        returnUrl,
        customerId,
        setAdyenOrder,
        setAdyenAction,
        setOrderNo,
        navigate,
        adyenConfig
    } = props

    const {
        paymentMethodsConfiguration: additionalPaymentMethodsConfiguration,
        onError: adyenOnError,
        afterSubmit: adyenAfterSubmit,
        beforeSubmit: adyenBeforeSubmit,
        afterAdditionalDetails: adyenAfterAdditionalDetails,
        beforeAdditionalDetails: adyenBeforeAdditionalDetails
    } = adyenConfig || {}

    return useCallback(
        async ({
            beforeSubmit = [],
            afterSubmit = [],
            beforeAdditionalDetails = [],
            afterAdditionalDetails = [],
            onError = []
        }) => {
            return getPaymentMethodsConfig({
                additionalPaymentMethodsConfiguration,
                paymentMethods: adyenPaymentMethods?.paymentMethods,
                isCustomerRegistered,
                token,
                site,
                basket,
                adyenOrder,
                returnUrl,
                customerId,
                setAdyenOrder,
                setAdyenAction,
                setOrderNo,
                navigate,
                onError: [...onError, ...(adyenOnError || [])],
                afterSubmit: [...afterSubmit, ...(adyenAfterSubmit || []), onPaymentsSuccess],
                beforeSubmit: [...beforeSubmit, ...(adyenBeforeSubmit || [])],
                afterAdditionalDetails: [
                    ...afterAdditionalDetails,
                    ...(adyenAfterAdditionalDetails || []),
                    onPaymentsDetailsSuccess
                ],
                beforeAdditionalDetails: [...beforeAdditionalDetails, ...(adyenBeforeAdditionalDetails || [])]
            })
        },
        [props]
    )
}

export default usePaymentMethodsConfiguration