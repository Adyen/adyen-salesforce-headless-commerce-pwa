import {baseConfig} from '../helpers/baseConfig'

export const cardConfig = (props) => {
    const isRegistered = props?.customerType?.isRegistered
    const onBinValue = (event) => {
        console.log(event)
    }
    const onBinLookup = (event) => {
        console.log(event)
    }
    return {
        ...baseConfig(props),
        showPayButton: false,
        hasHolderName: true,
        holderNameRequired: true,
        billingAddressRequired: false,
        enableStoreDetails: isRegistered,
        onBinValue: onBinValue,
        onBinLookup: onBinLookup
    }
}
