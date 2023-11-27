import {baseConfig} from '../helpers/baseConfig'

export const paypalConfig = (props) => {
    return {
        ...baseConfig(props),
        showPayButton: true
    }
}
