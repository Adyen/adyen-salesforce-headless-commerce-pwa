import React from 'react'
import {AdyenCheckout, AdyenCheckoutProvider} from '@adyen/adyen-salesforce-pwa'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import {useAccessToken, useCustomerId, useCustomerType} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
const AdyenCheckoutRedirectContainer = () => {
    const {data: basket} = useCurrentBasket()
    if (!basket) {
        return null
    }
    return (
        <AdyenCheckoutProvider
            useAccessToken={useAccessToken}
            useCustomerId={useCustomerId}
            useCustomerType={useCustomerType}
            useMultiSite={useMultiSite}
        >
            <AdyenCheckout showLoading />
        </AdyenCheckoutProvider>
    )
}

AdyenCheckoutRedirectContainer.propTypes = {
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any,
    useMultiSite: PropTypes.any
}

export default AdyenCheckoutRedirectContainer
