import React, {useEffect, useState} from 'react'
import {useIntl} from 'react-intl'
import PropTypes from 'prop-types'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import {API_ERROR_MESSAGE} from '@salesforce/retail-react-app/app/constants'

import {AdyenCheckout, pageTypes} from '@adyen/adyen-salesforce-pwa'

const AdyenCheckoutRedirectContainer = () => {
    const {data: basket} = useCurrentBasket()
    const customerId = useCustomerId()
    const {getTokenWhenReady} = useAccessToken()
    const navigate = useNavigation()
    const {locale, site} = useMultiSite()
    const {formatMessage} = useIntl()

    const [authToken, setAuthToken] = useState()
    const showToast = useToast()

    const showError = () => {
        showToast({
            title: formatMessage(API_ERROR_MESSAGE),
            status: 'error'
        })
    }

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

    const spinner = <LoadingSpinner wrapperStyles={{height: '100vh'}} />
    return (
        <AdyenCheckout
            // Required props
            authToken={authToken}
            site={site}
            locale={locale}
            navigate={navigate}
            basket={basket}
            // Optional
            page={pageTypes.REDIRECT}
            customerId={customerId}
            // Callbacks
            onError={[showError]}
            // UI
            spinner={<LoadingSpinner wrapperStyles={{height: '100vh'}} />}
        />
    )
}

AdyenCheckoutRedirectContainer.propTypes = {
    useAccessToken: PropTypes.any,
    useCustomerId: PropTypes.any,
    useCustomerType: PropTypes.any,
    useMultiSite: PropTypes.any
}

export default AdyenCheckoutRedirectContainer
