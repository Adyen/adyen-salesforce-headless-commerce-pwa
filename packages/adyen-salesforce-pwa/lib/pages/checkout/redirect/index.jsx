import React from 'react'
import AdyenCheckout from '../../../components/adyenCheckout'
import {AdyenCheckoutProvider} from '../../../context/adyen-checkout-context'
import PropTypes from 'prop-types'

const AdyenCheckoutRedirectContainer = ({useAccessToken, useCustomerId, useCustomerType}) => {
    return (
        <AdyenCheckoutProvider
            useAccessToken={useAccessToken}
            useCustomerId={useCustomerId}
            useCustomerType={useCustomerType}
        >
            <AdyenCheckout />
        </AdyenCheckoutProvider>
    )
}

AdyenCheckoutRedirectContainer.propTypes = {
    children: PropTypes.any,
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any
}

export default AdyenCheckoutRedirectContainer
