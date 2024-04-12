import React from 'react'
import {AdyenCheckoutContext} from '../contexts/adyen-checkout-context'

/**
 * A hook for managing checkout state and actions
 * @returns {Object} Checkout data and actions
 */
const useAdyenCheckout = () => {
    return React.useContext(AdyenCheckoutContext)
}

export default useAdyenCheckout
