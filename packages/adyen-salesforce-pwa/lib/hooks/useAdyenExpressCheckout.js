import React from 'react'
import {AdyenExpressCheckoutContext} from '../contexts/adyen-express-checkout-context'

/**
 * A hook for managing checkout state and actions
 * @returns {Object} Checkout data and actions
 */
const useAdyenExpressCheckout = () => {
    return React.useContext(AdyenExpressCheckoutContext)
}

export default useAdyenExpressCheckout
