import {baseConfig} from '../helpers/baseConfig'

export const amazonPayConfig = (props) => {
    return {
        ...baseConfig(props),
        showPayButton: true,
        productType: 'PayAndShip',
        checkoutMode: 'ProcessOrder',
        returnUrl: window.location.href
    }
}
