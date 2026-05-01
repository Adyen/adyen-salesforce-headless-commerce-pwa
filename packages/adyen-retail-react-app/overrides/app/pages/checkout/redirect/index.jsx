import React, {useEffect, useState} from 'react'
import {useIntl} from 'react-intl'
import PropTypes from 'prop-types'
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import {API_ERROR_MESSAGE} from '@salesforce/retail-react-app/app/constants'

import {AdyenCheckout, pageTypes} from '@adyen/adyen-salesforce-pwa'

const AdyenCheckoutRedirectContainer = () => {
    const customerId = useCustomerId()
    const {getTokenWhenReady} = useAccessToken()
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

    if (!authToken) {
        return
    }

    return (
        <AdyenCheckout
            authToken={authToken}
            page={pageTypes.REDIRECT}
            customerId={customerId}
            onError={[showError]}
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
