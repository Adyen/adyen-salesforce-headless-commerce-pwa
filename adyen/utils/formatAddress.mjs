export const formatAddressInAdyenFormat = (address) => {
    return {
        city: address?.city || '',
        country: address?.countryCode || '',
        houseNumberOrName: address?.address2 || '',
        postalCode: address?.postalCode || '',
        stateOrProvince: address?.stateCode || '',
        street: address?.address1 || ''
    }
}

