import {baseConfig} from '../helpers/baseConfig'

export const cardConfig = (props) => {
    const isRegistered = props?.customerType?.isRegistered
    return {
        ...baseConfig(props),
        showPayButton: true,
        hasHolderName: true,
        holderNameRequired: true,
        billingAddressRequired: false,
        enableStoreDetails: isRegistered
    }
}
