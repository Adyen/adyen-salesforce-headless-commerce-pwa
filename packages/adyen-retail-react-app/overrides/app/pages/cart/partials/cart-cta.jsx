/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {Fragment} from 'react'
import {FormattedMessage} from 'react-intl'
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
import {useAccessToken, useCustomerId, useCustomerType} from '@salesforce/commerce-sdk-react'
import {AdyenExpressCheckoutProvider, ApplePayExpress} from '@adyen/adyen-salesforce-pwa'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import PropTypes from 'prop-types'
/* -----------------Adyen End ------------------------ */

const CartCta = () => {
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
                <AdyenExpressCheckoutProvider
                    useAccessToken={useAccessToken}
                    useCustomerId={useCustomerId}
                    useCustomerType={useCustomerType}
                    useMultiSite={useMultiSite}
                >
                    <ApplePayExpress />
                </AdyenExpressCheckoutProvider>
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
