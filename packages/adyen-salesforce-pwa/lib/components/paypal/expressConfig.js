import {baseConfig} from '../helpers/baseConfig'

export const paypalExpressConfig = (props = {}) => {
    const {buttonStyle, disablePayPalCredit, shippingPreference, ...baseProps} = props

    return {
        ...baseConfig(baseProps),
        showPayButton: true,
        isExpress: true,
        ...(typeof disablePayPalCredit === 'boolean' && {blockPayPalCredit: disablePayPalCredit}),
        ...(buttonStyle && {style: buttonStyle}),
        ...(shippingPreference && {shippingPreference})
    }
}
