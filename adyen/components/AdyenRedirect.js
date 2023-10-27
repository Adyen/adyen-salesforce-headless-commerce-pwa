import React, {useEffect, useRef, useState} from 'react'
import {Center, Spinner} from '@chakra-ui/react'
import {useAdyenCheckout} from '../context/adyen-checkout-context'
import '@adyen/adyen-web/dist/adyen.css'
import AdyenCheckout from '@adyen/adyen-web'
import {AdyenPaymentsDetailsService} from '../services/payments-details'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useToast} from '@salesforce/retail-react-app/app/components/shared/ui'
import {useIntl} from 'react-intl'

const AdyenRedirect = () => {
    const [isLoading, setIsLoading] = useState(true)
    const {adyenPaymentMethods} = useAdyenCheckout()
    const redirectContainer = useRef(null)
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()
    const navigate = useNavigation()
    const toast = useToast()
    const {formatMessage} = useIntl()

    const handleRedirect = async () => {
        try {
            const token = await getTokenWhenReady()
            const urlParams = new URLSearchParams(location.search)
            const redirectResult = urlParams.get('redirectResult')
            const checkout = await AdyenCheckout({
                environment: adyenPaymentMethods.ADYEN_ENVIRONMENT,
                clientKey: adyenPaymentMethods.ADYEN_CLIENT_KEY,
                async onAdditionalDetails(state, component) {
                    const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(token)
                    const paymentsDetailsResponse =
                        await adyenPaymentsDetailsService.submitPaymentsDetails(
                            state,
                            customerId
                        )
                    if (paymentsDetailsResponse?.isSuccessful) {
                        navigate(
                            `/checkout/confirmation/${paymentsDetailsResponse.merchantReference}`
                        )
                    } else if (paymentsDetailsResponse?.action) {
                        await component.handleAction(paymentsDetailsResponse.action)
                    } else {
                        navigate(`/`)
                        toast({
                            title: formatMessage({
                                id: 'checkout.message.generic_error',
                                defaultMessage: 'An unexpected error occurred during checkout.'
                            }),
                            status: 'error',
                            position: 'top-right',
                            isClosable: true
                        })
                    }
                }
            })
            checkout.submitDetails({details: {redirectResult}})
        } catch (err) {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (redirectContainer.current && adyenPaymentMethods) {
            handleRedirect()
        }
    }, [adyenPaymentMethods])

    return (
        <Center>
            {isLoading && <Spinner color="blue.500" size="xl" />}
            <div ref={redirectContainer} className="payment"></div>
        </Center>
    )
}

export default AdyenRedirect
