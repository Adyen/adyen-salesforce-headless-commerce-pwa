/**
 * Formats a PayPal shipping address for the shopper details update.
 * @param {object} paypalShippingAddress - The delivery address from PayPal
 * @param {string} paypalShippingAddress.city - The city name
 * @param {string} [paypalShippingAddress.country] - The country code (from onAuthorized)
 * @param {string} [paypalShippingAddress.countryCode] - The country code (from onShippingAddressChange)
 * @param {string} paypalShippingAddress.postalCode - The postal/ZIP code
 * @param {string} [paypalShippingAddress.stateOrProvince] - The state/province code (from onAuthorized)
 * @param {string} [paypalShippingAddress.state] - The state/province code (from onShippingAddressChange)
 * @param {string} [paypalShippingAddress.street] - The street address
 * @param {string} [paypalShippingAddress.houseNumberOrName] - The house number or name
 * @returns {object} Delivery address formatted for Salesforce Commerce Cloud basket services
 * @returns {string} return.city - The city name
 * @returns {string} return.country - The country code
 * @returns {string} return.postalCode - The postal/ZIP code
 * @returns {string} return.stateOrProvince - The state/province code
 * @returns {string} return.street - The street address
 */
export function formatPayPalDeliveryAddress(paypalShippingAddress) {
    if (!paypalShippingAddress) {
        return null
    }

    return {
        city: paypalShippingAddress.city || '',
        country: paypalShippingAddress.country || paypalShippingAddress.countryCode || '',
        postalCode: paypalShippingAddress.postalCode || '',
        stateOrProvince: paypalShippingAddress.stateOrProvince || paypalShippingAddress.state || '',
        street: paypalShippingAddress.street || ''
    }
}

/**
 * Formats PayPal payer information combined with shipping and billing addresses for complete shopper details.
 * @param {object} payer - The payer object from PayPal's authorized event
 * @param {string} payer.email_address - The payer's email
 * @param {object} payer.name - The payer's name object
 * @param {string} payer.name.given_name - The payer's first name
 * @param {string} payer.name.surname - The payer's last name
 * @param {object} payer.phone - The payer's phone object
 * @param {object} payer.phone.phone_number - The phone number object
 * @param {string} payer.phone.phone_number.national_number - The phone number
 * @param {object} deliveryAddress - The delivery address from PayPal
 * @param {object} [billingAddress] - The billing address from PayPal (optional, only for updateShopperDetails)
 * @returns {object} Complete shopper details for Salesforce Commerce Cloud basket services
 * @returns {object} return.deliveryAddress - The formatted delivery address
 * @returns {object} [return.billingAddress] - The formatted billing address (if provided)
 * @returns {object} return.profile - The shopper profile information
 * @returns {string} return.profile.email - The shopper's email
 * @returns {string} return.profile.firstName - The shopper's first name
 * @returns {string} return.profile.lastName - The shopper's last name
 * @returns {string} return.profile.phone - The shopper's phone number
 */
export function formatPayPalShopperDetails(payer, deliveryAddress, billingAddress) {
    const result = {
        deliveryAddress: formatPayPalDeliveryAddress(deliveryAddress),
        profile: {
            email: payer?.email_address || '',
            firstName: payer?.name?.given_name || '',
            lastName: payer?.name?.surname || '',
            phone: payer?.phone?.phone_number?.national_number || ''
        }
    }

    if (billingAddress) {
        result.billingAddress = formatPayPalDeliveryAddress(billingAddress)
    }

    return result
}
