import React, {useEffect, useState} from 'react'
import {AdyenCheckout, AdyenCheckoutProvider} from '@adyen/adyen-salesforce-pwa'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'

const AdyenCheckoutRedirectContainer = () => {
    const {data: basket} = useCurrentBasket()
    const customerId = useCustomerId()
    const {getTokenWhenReady} = useAccessToken()
    const navigate = useNavigation()
    const {locale, site} = useMultiSite()

    const [authToken, setAuthToken] = useState()

    useEffect(() => {
        const getToken = async () => {
            const token = await getTokenWhenReady()
            setAuthToken(token)
        }

        getToken()
    }, [])

    if (!authToken || !basket) {
        return
    }

    return (
        <AdyenCheckoutProvider
            authToken={authToken}
            customerId={customerId}
            locale={locale}
            site={site}
            basket={basket}
            navigate={navigate}
            page={'redirect'}
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
