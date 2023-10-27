import React, {useEffect, useRef, useState} from 'react'
import {Center, Spinner} from '@chakra-ui/react'
import {useAdyenCheckout} from '../context/adyen-checkout-context'
import '@adyen/adyen-web/dist/adyen.css'
import AdyenCheckout from '@adyen/adyen-web'

const AdyenRedirect = () => {
    const [isLoading, setIsLoading] = useState(true)
    const {adyenPaymentMethods} = useAdyenCheckout()
    const redirectContainer = useRef(null)

    const handleRedirect = async () => {
        try {
            const urlParams = new URLSearchParams(location.search)
            const redirectResult = urlParams.get('redirectResult')
            console.log(adyenPaymentMethods)
            const checkout = await AdyenCheckout({
                environment: adyenPaymentMethods.ADYEN_ENVIRONMENT,
                clientKey: adyenPaymentMethods.ADYEN_CLIENT_KEY,
                onPaymentCompleted(data, element) {
                    console.log(data)
                }
            })
            console.log(checkout)
            checkout.submitDetails({details: {redirectResult}})
        } catch (err) {
            console.log(err)
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
