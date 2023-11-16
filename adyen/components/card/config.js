import {baseConfig} from '../helpers/baseConfig'

export const cardConfig = (props) => {
    const isRegistered = props?.customerType?.isRegistered
    return {
        ...baseConfig(props),
        _disableClickToPay: true,
        showPayButton: true,
        hasHolderName: true,
        holderNameRequired: true,
        billingAddressRequired: false,
        enableStoreDetails: isRegistered,
        onBinLookup: (event) => {
            console.log(event)
        },
        onBinValue: (event) => {
            console.log(event)
        }
    }
}
