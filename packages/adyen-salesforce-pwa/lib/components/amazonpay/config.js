import {baseConfig} from '../helpers/baseConfig'

export const amazonPayConfig = (props) => {
    return {
        ...baseConfig(props),
        showPayButton: true,
        productType: 'PayAndShip',
        checkoutMode: 'ProcessOrder',
        returnUrl: props.returnUrl || `${window.location.href}/redirect`,
        onClick: async (resolve, reject) => {
            try {
                const [onBillingSubmit] = props.beforeSubmit
                await onBillingSubmit()
                resolve()
            } catch (err) {
                reject(err)
            }
        }
    }
}
