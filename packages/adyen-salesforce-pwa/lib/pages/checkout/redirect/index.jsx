import React from 'react'
import AdyenCheckout from '../../../components/adyenCheckout'
import {AdyenCheckoutProvider} from '../../../context/adyen-checkout-context'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'

const AdyenCheckoutRedirectContainer = ({useAccessToken, useCustomerId, useCustomerType}) => {
    const {data: basket} = useCurrentBasket()
    if (!basket) {
        return null
    }
    return (
        <AdyenCheckoutProvider
            useAccessToken={useAccessToken}
            useCustomerId={useCustomerId}
            useCustomerType={useCustomerType}
        >
            <AdyenCheckout showLoading />
        </AdyenCheckoutProvider>
    )
}

AdyenCheckoutRedirectContainer.propTypes = {
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any
}

export default AdyenCheckoutRedirectContainer
