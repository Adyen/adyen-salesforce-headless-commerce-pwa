/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {Fragment, useEffect, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {Flex, Button} from '@salesforce/retail-react-app/app/components/shared/ui'
import {
    AmexIcon,
    DiscoverIcon,
    LockIcon,
    MastercardIcon,
    VisaIcon
} from '@salesforce/retail-react-app/app/components/icons'
import Link from '@salesforce/retail-react-app/app/components/link'
/* -----------------Adyen Begin ------------------------ */
import '@adyen/adyen-salesforce-pwa/dist/app/adyen.css'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {ApplePayExpress} from '@adyen/adyen-salesforce-pwa'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import PropTypes from 'prop-types'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import {API_ERROR_MESSAGE} from '@salesforce/retail-react-app/app/constants'
/* -----------------Adyen End ------------------------ */

const CartCta = () => {
    const {formatMessage} = useIntl()
    const customerId = useCustomerId()
    const {getTokenWhenReady} = useAccessToken()
    const navigate = useNavigation()
    const {locale, site} = useMultiSite()
    const {data: basket} = useCurrentBasket()

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
        <Fragment>
            <Button
                as={Link}
                to="/checkout"
                width={['95%', '95%', '95%', '100%']}
                marginTop={[6, 6, 2, 2]}
                mb={4}
                rightIcon={<LockIcon />}
                variant="solid"
            >
                <FormattedMessage
                    defaultMessage="Proceed to Checkout"
                    id="cart_cta.link.checkout"
                />
            </Button>
            <Flex justify={'center'}>
                <ApplePayExpress
                    authToken={authToken}
                    customerId={customerId}
                    locale={locale}
                    site={site}
                    basket={basket}
                    navigate={navigate}
                    // Callbacks
                    onError={[showError]}
                    // UI
                    spinner={<LoadingSpinner wrapperStyles={{height: '100vh'}} />}
                />
            </Flex>
            <Flex justify={'center'}>
                <VisaIcon height={8} width={10} mr={2} />
                <MastercardIcon height={8} width={10} mr={2} />
                <AmexIcon height={8} width={10} mr={2} />
                <DiscoverIcon height={8} width={10} mr={2} />
            </Flex>
        </Fragment>
    )
}

CartCta.propTypes = {
    shippingMethods: PropTypes.object
}

export default CartCta
