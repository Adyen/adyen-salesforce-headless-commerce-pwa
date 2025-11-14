import {baseConfig} from '../helpers/baseConfig'

export const cardConfig = (props) => {
    const isRegistered = props?.isCustomerRegistered
    return {
        ...baseConfig(props),
        showPayButton: true,
        hasHolderName: true,
        holderNameRequired: true,
        billingAddressRequired: false,
        enableStoreDetails: isRegistered,
        clickToPayConfiguration: {
            merchantDisplayName: props?.merchantDisplayName,
            shopperEmail: props?.basket?.customerInfo?.email
        }
    }
}
