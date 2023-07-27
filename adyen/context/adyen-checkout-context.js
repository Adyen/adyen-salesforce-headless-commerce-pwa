/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {AdyenSessionsService} from "../services/sessions";

const AdyenCheckoutContext = React.createContext()

export const AdyenCheckoutProvider = ({children}) => {
    const {getTokenWhenReady} = useAccessToken()
    const customerId = useCustomerId()

    const [adyenSession, setAdyenSession] = useState()
    const [adyenStateData, setAdyenStateData] = useState()

    useEffect(() => {
        const fetchSession = async () => {
            const token = await getTokenWhenReady()
            const adyenSessionsService = new AdyenSessionsService(token)
            try {
                const data = await adyenSessionsService.createSession(customerId)
                setAdyenSession(data?.length ? data[0] : {error: true})
            } catch (error) {
                setAdyenSession({error})
            }
        }
        fetchSession()
    }, [])

    const value = {
        adyenSession,
        adyenStateData,
        setAdyenStateData: (data) => setAdyenStateData(data)
    }

    return <AdyenCheckoutContext.Provider value={value}>{children}</AdyenCheckoutContext.Provider>
}

AdyenCheckoutProvider.propTypes = {
    children: PropTypes.any
}

/**
 * A hook for managing checkout state and actions
 * @returns {Object} Checkout data and actions
 */
export const useAdyenCheckout = () => {
    return React.useContext(AdyenCheckoutContext)
}
