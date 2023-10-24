import {baseConfig} from '../helpers/baseConfig'

export const applePayConfig = (props) => {
    return {
        ...baseConfig(props),
        showPayButton: true
    }
}
